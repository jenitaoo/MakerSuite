from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import requests
from .adapters import EtsyAdapter
from .utils import normalise_listing

class EtsyListingsView(APIView):
    def get(self, request):
        access_token = request.user.profile.etsy_access_token
        adapter = EtsyAdapter(access_token)
        data = adapter.get_listings()

        normalized = [normalise_listing(item) for item in data.get("results", [])]
        return Response(normalized)
