import os
import dj_database_url
from .settings import *

# -----------------------------
# SECURITY
# -----------------------------
DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY")

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    ".railway.app,localhost,127.0.0.1"
).split(",")

# -----------------------------
# DATABASE
# -----------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

# -----------------------------
# CORS / CSRF
# -----------------------------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

# -----------------------------
# COOKIES
# -----------------------------
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"

# -----------------------------
# STATIC FILES
# -----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# -----------------------------
# MIDDLEWARE (correct + safe)
# -----------------------------
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

# -----------------------------
# APPS
# -----------------------------
INSTALLED_APPS += [
    "cloudinary",
    "cloudinary_storage",
]

# -----------------------------
# CLOUDINARY
# -----------------------------
DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
    "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
}

# -----------------------------
# SECURITY HEADERS
# -----------------------------
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# -----------------------------
# ETSY
# -----------------------------
ETSY_REDIRECT_URI = os.environ.get("ETSY_REDIRECT_URI")