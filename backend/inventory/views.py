from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import RawMaterial, Project, ProjectImage, ProjectMaterial, MakeLog, InventoryLog
from products.models import SaleTag, SaleLog
from .serializers import (
    RawMaterialSerializer, ProjectSerializer, ProjectImageSerializer,
    ProjectMaterialSerializer, MakeLogSerializer, InventoryLogSerializer,
)
from decimal import Decimal


class RawMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = RawMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return RawMaterial.objects.filter(owner=self.request.user.userprofile)

    def get_serializer_context(self):
        return {"request": self.request}

    def perform_create(self, serializer):
        tags = self.request.data.get("tags")
        if isinstance(tags, str):
            import json
            try:
                tags = json.loads(tags)
            except (ValueError, TypeError):
                tags = []
        serializer.save(owner=self.request.user.userprofile, tags=tags if tags is not None else [])

    def perform_update(self, serializer):
        tags = self.request.data.get("tags")
        if isinstance(tags, str):
            import json
            try:
                tags = json.loads(tags)
            except (ValueError, TypeError):
                tags = []
            serializer.save(tags=tags)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        material = self.get_object()
        quantity = request.data.get("quantity")
        notes = request.data.get("notes", "")

        if not quantity:
            return Response({"error": "quantity is required"}, status=400)
        try:
            quantity = Decimal(str(quantity))
            if quantity <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "quantity must be a positive number"}, status=400)

        material.quantity += quantity
        material.save(update_fields=["quantity"])

        InventoryLog.objects.create(
            owner=request.user.userprofile,
            material=material,
            change_type=InventoryLog.CHANGE_RESTOCK,
            quantity_change=quantity,
            notes=notes,
        )

        return Response(RawMaterialSerializer(material).data)

    @action(detail=True, methods=["post"])
    def deduct(self, request, pk=None):
        material = self.get_object()
        quantity = request.data.get("quantity")
        notes = request.data.get("notes", "")

        if not quantity:
            return Response({"error": "quantity is required"}, status=400)
        try:
            quantity = Decimal(str(quantity))
            if quantity <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "quantity must be a positive number"}, status=400)

        if quantity > Decimal(str(material.quantity)):
            return Response(
                {"error": f"Cannot deduct {quantity} — only {material.quantity} in stock"},
                status=400,
            )

        material.quantity -= quantity
        material.save(update_fields=["quantity"])

        InventoryLog.objects.create(
            owner=request.user.userprofile,
            material=material,
            change_type=InventoryLog.CHANGE_MANUAL_DEDUCT,
            quantity_change=-quantity,
            notes=notes,
        )

        return Response(RawMaterialSerializer(material).data)

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        material = self.get_object()
        logs = InventoryLog.objects.filter(
            owner=request.user.userprofile,
            material=material,
        ).order_by("-created_at")
        return Response(InventoryLogSerializer(logs, many=True).data)

    def destroy(self, request, *args, **kwargs):
        material = self.get_object()
        if material.project_materials.exists():
            return Response(
                {"error": "This material is linked to one or more projects. Remove it from those projects first."},
                status=400,
            )
        return super().destroy(request, *args, **kwargs)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(
            owner=self.request.user.userprofile
        ).prefetch_related(
            "project_materials__material",
            "make_logs",
            "images",          # ← new
        )

    def get_serializer_context(self):
        return {"request": self.request}   # ← needed for image_url absolute URIs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    # ── Images ────────────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_image(self, request, pk=None):
        project = self.get_object()
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "image is required"}, status=400)

        order = request.data.get("order", 0)
        img = ProjectImage.objects.create(project=project, image=image_file, order=order)
        return Response(
            ProjectImageSerializer(img, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="images/(?P<image_id>[^/.]+)",
    )
    def delete_image(self, request, pk=None, image_id=None):
        project = self.get_object()
        try:
            img = ProjectImage.objects.get(id=image_id, project=project)
        except ProjectImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=404)
        img.image.delete(save=False)   # delete file from storage
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Log Make ──────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="log-make")
    def log_make(self, request, pk=None):
        project = self.get_object()
        units_made = request.data.get("units_made")
        date_made = request.data.get("date_made")
        deduct_materials = request.data.get("deduct_materials", False)
        notes = request.data.get("notes", "")
        duration_minutes = request.data.get("duration_minutes", None)
        material_overrides = {
            str(o["material_id"]): o["quantity_used"]
            for o in request.data.get("material_overrides", [])
        }

        if units_made is None:
            return Response({"error": "units_made is required"}, status=400)
        try:
            units_made = int(units_made)
            if units_made <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "units_made must be a positive integer"}, status=400)

        if duration_minutes is not None:
            try:
                duration_minutes = int(duration_minutes)
                if duration_minutes < 0:
                    duration_minutes = None
            except (ValueError, TypeError):
                duration_minutes = None

        make_log = MakeLog.objects.create(
            project=project,
            units_made=units_made,
            date_made=date_made or None,
            notes=notes or None,
            deducted_materials=deduct_materials,
            duration_minutes=duration_minutes,
        )

        if project.product:
            project.product.internal_quantity = (
                project.product.internal_quantity or 0
            ) + units_made
            project.product.save(update_fields=["internal_quantity"])

            # Push quantity change to Etsy if linked
            sync_quantity_to_etsy(request.user, project.product, new_quantity)

        if deduct_materials:
            for pm in project.project_materials.all():
                override_qty = material_overrides.get(str(pm.material_id))
                deduct_qty = Decimal(str(override_qty)) if override_qty else (
                    Decimal(str(pm.quantity_used)) if pm.quantity_used is not None else None
                )
                if deduct_qty:
                    mat = pm.material
                    if deduct_qty > Decimal(str(mat.quantity)):
                        deduct_qty = Decimal(str(mat.quantity))
                    mat.quantity -= deduct_qty
                    mat.save(update_fields=["quantity"])
                    InventoryLog.objects.create(
                        owner=request.user.userprofile,
                        material=mat,
                        project=project,
                        change_type=InventoryLog.CHANGE_MAKE,
                        quantity_change=-deduct_qty,
                        notes=notes or f"Deducted for make: {project.name}",
                    )

        return Response(MakeLogSerializer(make_log).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="make-logs")
    def make_logs(self, request, pk=None):
        project = self.get_object()
        logs = project.make_logs.all().order_by("-created_at")
        return Response(MakeLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="materials")
    def materials(self, request, pk=None):
        project = self.get_object()

        if request.method == "GET":
            return Response(
                ProjectMaterialSerializer(project.project_materials.all(), many=True).data
            )

        material_id = request.data.get("material_id")
        quantity_used = request.data.get("quantity_used", None)

        if not material_id:
            return Response({"error": "material_id is required"}, status=400)

        try:
            material = RawMaterial.objects.get(
                id=material_id,
                owner=request.user.userprofile,
            )
        except RawMaterial.DoesNotExist:
            return Response({"error": "Material not found"}, status=404)

        pm, created = ProjectMaterial.objects.get_or_create(
            project=project,
            material=material,
            defaults={"quantity_used": quantity_used},
        )

        if not created:
            pm.quantity_used = quantity_used
            pm.save(update_fields=["quantity_used"])

        return Response(
            ProjectMaterialSerializer(pm).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="materials/(?P<material_id>[^/.]+)",
    )
    def remove_material(self, request, pk=None, material_id=None):
        project = self.get_object()
        try:
            pm = ProjectMaterial.objects.get(project=project, material_id=material_id)
        except ProjectMaterial.DoesNotExist:
            return Response({"error": "Material not found on this project"}, status=404)
        pm.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="link-product")
    def link_product(self, request, pk=None):
        project = self.get_object()
        product_id = request.data.get("product_id")

        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        try:
            from products.models import Product
            product = Product.objects.get(id=product_id, owner=request.user.userprofile)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        project.product = product
        project.save(update_fields=["product"])

        # Override product quantity with project's current stock
        old_product_qty = product.internal_quantity or 0
        project_qty = project.in_stock
        product.internal_quantity = project_qty
        product.save(update_fields=["internal_quantity"])

        MakeLog.objects.create(
            project=project,
            units_made=project_qty,
            notes=f"Linked to product: {product.title}. Project stock ({project_qty} units) overrode product stock ({old_product_qty} units).",
            deducted_materials=False,
        )

        return Response(ProjectSerializer(project).data)