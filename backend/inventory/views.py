from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RawMaterial, Project, ProjectMaterial, MakeLog, SaleTag, SaleLog, InventoryLog
from .serializers import (
    RawMaterialSerializer, ProjectSerializer, ProjectMaterialSerializer,
    MakeLogSerializer, SaleTagSerializer, SaleLogSerializer, InventoryLogSerializer
)
from decimal import Decimal

class RawMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = RawMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RawMaterial.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

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

        if quantity > float(material.quantity):
            return Response(
                {"error": f"Cannot deduct {quantity} — only {material.quantity} in stock"},
                status=400
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
                status=400
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
            "sale_logs__tags",
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    @action(detail=True, methods=["post"], url_path="log-make")
    def log_make(self, request, pk=None):
        project = self.get_object()
        units_made = request.data.get("units_made")
        date_made = request.data.get("date_made")
        deduct_materials = request.data.get("deduct_materials", False)
        notes = request.data.get("notes", "")
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

        make_log = MakeLog.objects.create(
            project=project,
            units_made=units_made,
            date_made=date_made or None,
            notes=notes or None,
            deducted_materials=deduct_materials,
        )

        # update linked product quantity
        if project.product:
            project.product.internal_quantity = (
                project.product.internal_quantity or 0
            ) + units_made
            project.product.save(update_fields=["internal_quantity"])

        # deduct materials if requested
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

    @action(detail=True, methods=["post"], url_path="log-sale")
    def log_sale(self, request, pk=None):
        project = self.get_object()
        units_sold = request.data.get("units_sold")
        sale_date = request.data.get("sale_date")
        tag_ids = request.data.get("tag_ids", [])
        source = request.data.get("source", SaleLog.SOURCE_MANUAL)
        notes = request.data.get("notes", "")
        sale_price = request.data.get("sale_price", None)
        unit_prices = request.data.get("unit_prices", None)

        if not units_sold:
            return Response({"error": "units_sold is required"}, status=400)
        if not sale_date:
            return Response({"error": "sale_date is required"}, status=400)

        try:
            units_sold = int(units_sold)
            if units_sold <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "units_sold must be a positive integer"}, status=400)

        if units_sold > project.in_stock:
            return Response(
                {"error": f"Cannot log {units_sold} sold — only {project.in_stock} in stock"},
                status=400
            )

        # ensure Etsy tag exists if source is etsy
        if source == SaleLog.SOURCE_ETSY:
            etsy_tag, _ = SaleTag.objects.get_or_create(
                owner=request.user.userprofile,
                name="Etsy",
            )
            if etsy_tag.id not in tag_ids:
                tag_ids.append(etsy_tag.id)

        tags = SaleTag.objects.filter(
            id__in=tag_ids,
            owner=request.user.userprofile,
        )

        sale_log = SaleLog.objects.create(
            owner=request.user.userprofile,
            project=project,
            units_sold=units_sold,
            sale_date=sale_date,
            source=source,
            notes=notes or None,
            sale_price=sale_price,
            unit_prices=unit_prices or [],
        )
        sale_log.tags.set(tags)

        # update linked product quantity
        if project.product:
            project.product.internal_quantity = max(
                0, (project.product.internal_quantity or 0) - units_sold
            )
            project.product.save(update_fields=["internal_quantity"])

        InventoryLog.objects.create(
            owner=request.user.userprofile,
            project=project,
            change_type=InventoryLog.CHANGE_SALE,
            quantity_change=-units_sold,
            notes=notes or f"Sale logged for project: {project.name}",
        )

        return Response(SaleLogSerializer(sale_log).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def sales(self, request, pk=None):
        project = self.get_object()
        logs = project.sale_logs.all().order_by("-sale_date")

        tag_ids = request.query_params.getlist("tags")
        if tag_ids:
            logs = logs.filter(tags__id__in=tag_ids).distinct()

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            logs = logs.filter(sale_date__gte=date_from)
        if date_to:
            logs = logs.filter(sale_date__lte=date_to)

        return Response(SaleLogSerializer(logs, many=True).data)

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
        url_path="materials/(?P<material_id>[^/.]+)"
    )
    def remove_material(self, request, pk=None, material_id=None):
        project = self.get_object()
        try:
            pm = ProjectMaterial.objects.get(
                project=project,
                material_id=material_id,
            )
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

        qty = product.internal_quantity or 0
        MakeLog.objects.create(
            project=project,
            units_made=qty,
            notes=f"Auto-initialized from linked product: {product.title} ({qty} units)",
            deducted_materials=False,
        )

        return Response(ProjectSerializer(project).data)
class SaleTagViewSet(viewsets.ModelViewSet):
    serializer_class = SaleTagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SaleTag.objects.filter(owner=self.request.user.userprofile)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    def destroy(self, request, *args, **kwargs):
        tag = self.get_object()
        if tag.name == "Etsy":
            return Response(
                {"error": "The Etsy tag is reserved and cannot be deleted"},
                status=400
            )
        return super().destroy(request, *args, **kwargs)