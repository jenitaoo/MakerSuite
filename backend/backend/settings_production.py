from .settings import *
import dj_database_url

# Security
DEBUG = False
SECRET_KEY = os.environ['SECRET_KEY']
ALLOWED_HOSTS = [
    os.environ.get('RAILWAY_STATIC_URL', '').replace('https://', ''),
    '.railway.app',
    'localhost',
]

# Database — Railway injects DATABASE_URL automatically
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ['DATABASE_URL'],
        conn_max_age=600,
    )
}

# CORS — allow your Vercel frontend
CORS_ALLOWED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'http://localhost:5173'),
]
CSRF_TRUSTED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'http://localhost:5173'),
]

# Cookies — must be None (not "localhost") in production
SESSION_COOKIE_DOMAIN = None
CSRF_COOKIE_DOMAIN = None
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Add whitenoise to middleware (after SecurityMiddleware)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    *MIDDLEWARE[2:],
]

# Cloudinary for media/image storage
import cloudinary
import cloudinary_storage

INSTALLED_APPS += ['cloudinary', 'cloudinary_storage']

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ['CLOUDINARY_CLOUD_NAME'],
    'API_KEY': os.environ['CLOUDINARY_API_KEY'],
    'API_SECRET': os.environ['CLOUDINARY_API_SECRET'],
}
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Etsy
ETSY_REDIRECT_URI = os.environ.get('ETSY_REDIRECT_URI')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')