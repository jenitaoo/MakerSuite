# MakerSuite
## 📌 Project Status: Active Development (Final-Year Project)
This repository contains the ongoing development of **MakerSuite**, a project I'm building as part of my studies and to help me build my small business, ["With Love Jeni"](https://carrd.co/dashboard/3880177350642321/build).
MakerSuite is a fully deployed prototype web application that gives handmade business owners a single place to manage all their business operations.
Intentionally designed around the real workflows of handmade businesses, it supports the maker at every stage of their day: planning and producing, managing listings and logging sales across both online (Etsy used as an example in the prototype) and in-person channels, and growing their business by reviewing performance. The platform is accessible, responsive across devices, and supports multiple users each with their own account and business data. It is flexible regardless of craft, so whether a crocheter tracks yarn by weight or a jewellery maker tracks beads by count, the same system works without workarounds.

The website is now live and free to use at [this link](https://app.withlovejeni.com/home)

## GitHub Repo
[Repo link](https://github.com/jenitaoo/MakerSuite)

## Tech Stack
| Layer        | Technology                                      |
|--------------|--------------------------------------------------|
| Frontend     | React, Vite, Tailwind CSS, shadcn/ui             |
| Backend      | Django 4.2, Django REST Framework                |
| Database     | PostgreSQL 15                                    |
| Auth         | Django session auth, Etsy OAuth 2.0 (PKCE)       |
| Deployment   | Vercel (frontend), Railway (backend + database)  |
| Dev Tools    | Docker, Docker Compose, GitHub Actions CI/CD     |
| Media        | Cloudinary (image hosting)                       |

## Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- A registered [Etsy Developer](https://www.etsy.com/developers) application (for OAuth credentials)
- A [Cloudinary](https://cloudinary.com/) account (for image uploads)

## Environment Setup
Create a `.env` file in the project root with the following variables:

```
DJANGO_SECRET_KEY=<your-django-secret-key>
DATABASE_URL=postgres://postgres:postgres@db:5432/postgres
DEBUG=True

ETSY_KEYSTRING=<your-etsy-api-key>
ETSY_SHARED_SECRET=<your-etsy-shared-secret>
ETSY_REDIRECT_URI=<your-etsy-oauth-callback-url>
ETSY_SCOPES=listings_r listings_w transactions_r

CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>

FRONTEND_URL=http://localhost:5173
```

## Running Locally
```bash
# Clone the repository
git clone <repository-url>
cd code

# Start all services (backend, frontend, database)
docker compose up

# In a separate terminal, run database migrations
docker compose exec backend python manage.py migrate

# (Optional) Create a superuser for Django admin
docker compose exec backend python manage.py createsuperuser
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:8000`.

## Running Tests
```bash
# Backend tests
docker compose exec backend pytest

# Frontend tests
cd ui && npm run test:ci
```

## Project Structure
```
code/
├── backend/                  # Django project root
│   ├── backend/              # Django config (settings, urls, wsgi)
│   ├── authentication/       # User accounts, session auth, Etsy OAuth
│   ├── products/             # Product catalogue, listings, markets, sales
│   ├── inventory/            # Materials, projects, make logs, inventory logs
│   └── integrations/         # Platform adapter pattern (Etsy adapter)
│
├── ui/                       # React frontend (Vite)
│   └── src/
│       ├── pages/            # Route-level page components
│       ├── components/       # UI components (inventory/, products/, ui/)
│       └── api.ts            # Axios API client
│
├── docker-compose.yml
├── .github/workflows/        # CI/CD pipeline
└── README.md
```

## Deployment
The production environment is deployed as follows:
- **Frontend** — hosted on Vercel, auto-deploys from `main` branch
- **Backend** — hosted on Railway as a containerised Django service
- **Database** — managed PostgreSQL instance on Railway

A staging environment mirrors this setup, deploying from the `staging` branch with a separate Railway service and database.

## Further Documentation
For full project documentation including research, requirements, design, implementation details, evaluation, and project management, refer to the accompanying project report.
