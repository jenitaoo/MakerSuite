from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RawMaterial, Make, MakeMaterial, SaleTag, SaleLog, InventoryLog
from .serializers import (
    RawMaterialSerializer, MakeSerializer, MakeMaterialSerializer,
    SaleTagSerializer, SaleLogSerializer, InventoryLogSerializer
)


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
            quantity = float(quantity)
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
            quantity = float(quantity)
            if quantity <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "quantity must be a positive number"}, status=400)

        if quantity > material.quantity:
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
        if material.make_materials.exists():
            return Response(
                {"error": "This material is linked to one or more makes. Remove it from those makes first."},
                status=400
            )
        return super().destroy(request, *args, **kwargs)


class MakeViewSet(viewsets.ModelViewSet):
    serializer_class = MakeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Make.objects.filter(
            owner=self.request.user.userprofile
        ).prefetch_related("make_materials__material", "salelogs__tags")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.userprofile)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        make = self.get_object()

        units_produced = request.data.get("units_produced")
        deduct_materials = request.data.get("deduct_materials", False)
        notes = request.data.get("notes", "")

        if units_produced is None:
            return Response({"error": "units_produced is required"}, status=400)

        try:
            units_produced = int(units_produced)
            if units_produced <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "units_produced must be a positive integer"}, status=400)

        make.units_produced += units_produced
        make.save(update_fields=["units_produced"])

        if make.product:
            make.product.internal_quantity = (make.product.internal_quantity or 0) + units_produced
            make.product.save(update_fields=["internal_quantity"])

        if deduct_materials:
            for make_material in make.make_materials.all():
                if make_material.quantity_used is not None:
                    mat = make_material.material
                    deduct_qty = float(make_material.quantity_used)
                    if deduct_qty > float(mat.quantity):
                        deduct_qty = float(mat.quantity)
                    mat.quantity -= deduct_qty
                    mat.save(update_fields=["quantity"])
                    InventoryLog.objects.create(
                        owner=request.user.userprofile,
                        material=mat,
                        make=make,
                        change_type=InventoryLog.CHANGE_MAKE_COMPLETION,
                        quantity_change=-deduct_qty,
                        notes=notes or f"Deducted for make: {make.name}",
                    )

        return Response(MakeSerializer(make).data)

    @action(detail=True, methods=["post"], url_path="log-sale")
    def log_sale(self, request, pk=None):
        make = self.get_object()
        units_sold = request.data.get("units_sold")
        sale_date = request.data.get("sale_date")
        tag_ids = request.data.get("tag_ids", [])
        source = request.data.get("source", SaleLog.SOURCE_MANUAL)
        notes = request.data.get("notes", "")

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

        if units_sold > make.available_units:
            return Response(
                {"error": f"Cannot log {units_sold} sold — only {make.available_units} available"},
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
            make=make,
            units_sold=units_sold,
            sale_date=sale_date,
            source=source,
            notes=notes,
        )
        sale_log.tags.set(tags)

        # update linked product quantity
        if make.product:
            make.product.internal_quantity = max(
                0, (make.product.internal_quantity or 0) - units_sold
            )
            make.product.save(update_fields=["internal_quantity"])

        InventoryLog.objects.create(
            owner=request.user.userprofile,
            make=make,
            change_type=InventoryLog.CHANGE_SALE,
            quantity_change=-units_sold,
            notes=notes or f"Sale logged for make: {make.name}",
        )

        return Response(SaleLogSerializer(sale_log).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def sales(self, request, pk=None):
        make = self.get_object()
        logs = make.salelogs.all().order_by("-sale_date")

        # filter by tag if provided
        tag_ids = request.query_params.getlist("tags")
        if tag_ids:
            logs = logs.filter(tags__id__in=tag_ids).distinct()

        # filter by date range
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            logs = logs.filter(sale_date__gte=date_from)
        if date_to:
            logs = logs.filter(sale_date__lte=date_to)

        return Response(SaleLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="materials")
    def materials(self, request, pk=None):
        make = self.get_object()

        if request.method == "GET":
            make_materials = make.make_materials.all()
            return Response(MakeMaterialSerializer(make_materials, many=True).data)

        # POST — add a material to the make
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

        make_material, created = MakeMaterial.objects.get_or_create(
            make=make,
            material=material,
            defaults={"quantity_used": quantity_used},
        )

        if not created:
            make_material.quantity_used = quantity_used
            make_material.save(update_fields=["quantity_used"])

        return Response(
            MakeMaterialSerializer(make_material).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path="materials/(?P<material_id>[^/.]+)")
    def remove_material(self, request, pk=None, material_id=None):
        make = self.get_object()
        try:
            make_material = MakeMaterial.objects.get(
                make=make,
                material_id=material_id,
            )
        except MakeMaterial.DoesNotExist:
            return Response({"error": "Material not found on this make"}, status=404)

        make_material.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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