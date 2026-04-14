from .settings import *
import os
import dj_database_url

# -----------------------------
# SECURITY
# -----------------------------
DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY", "unsafe-default")

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    ".railway.app,localhost,127.0.0.1"
).split(",")

# -----------------------------
# DATABASE (Railway PostgreSQL)
# -----------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

# -----------------------------
# CORS / CSRF (Frontend)
# -----------------------------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
]

CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
]

# -----------------------------
# COOKIES (production safe)
# -----------------------------
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"

SESSION_COOKIE_DOMAIN = None
CSRF_COOKIE_DOMAIN = None

# -----------------------------
# STATIC FILES (WhiteNoise)
# -----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# -----------------------------
# MIDDLEWARE (correct order)
# -----------------------------
from .settings import MIDDLEWARE as BASE_MIDDLEWARE

MIDDLEWARE = [
    BASE_MIDDLEWARE[0],  # SecurityMiddleware
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
] + list(BASE_MIDDLEWARE[1:])

# -----------------------------
# CLOUDINARY (media storage)
# -----------------------------
INSTALLED_APPS += [
    "cloudinary",
    "cloudinary_storage",
]

try:
    import cloudinary  # noqa
    import cloudinary_storage  # noqa
except Exception:
    pass

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
    "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
}

DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

# -----------------------------
# ETSY / EXTERNAL SERVICES
# -----------------------------
ETSY_REDIRECT_URI = os.environ.get("ETSY_REDIRECT_URI")
FRONTEND_URL = FRONTEND_URL

# -----------------------------
# OPTIONAL: SECURITY HEADERS
# -----------------------------
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True