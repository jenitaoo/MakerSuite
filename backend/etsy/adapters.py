import requests
from django.conf import settings

class EtsyAdapter:
    BASE_URL = "https://openapi.etsy.com/v3/application"

    def __init__(self, access_token):
        self.access_token = access_token

    def _headers(self):
        return {
            "x-api-key": settings.ETSY_API_KEY,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def get_listings(self):
        url = f"{self.BASE_URL}/shops/{settings.ETSY_SHOP_ID}/listings"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()
