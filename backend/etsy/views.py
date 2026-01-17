from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import requests
from .adapters import EtsyAdapter
from .utils import normalise_listing

class EtsyPingView(APIView):
    def get(self, request):
        url = "https://api.etsy.com/v3/application/openapi-ping"
        headers = {
            "x-api-key": settings.ETSY_API_KEY
        }

        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return Response(response.json())
        return Response({"error": "Ping failed"}, status=response.status_code)
class EtsyListingsView(APIView):
    def get(self, request):
        access_token = request.user.profile.etsy_access_token
        adapter = EtsyAdapter(access_token)
        data = adapter.get_listings()

        normalized = [normalise_listing(item) for item in data.get("results", [])]
        return Response(normalized)
