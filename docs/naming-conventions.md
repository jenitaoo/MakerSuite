# MakerSuite — Naming Conventions & Directory Structure (Updated for Django Backend)

> **Purpose:** Standardised naming and a recommended directory layout for the MakerSuite project using:
>
> - **Frontend:** React + TypeScript (Next.js or Vite)  
> - **Backend:** **Django** + Django REST Framework (Python)  
> - **Database:** PostgreSQL (managed via Django ORM / migrations)  
> - **Infrastructure:** Docker, docker-compose, CI/CD  
> - **Testing:** pytest / Django test runner, Vitest/Jest for frontend  
>
> Copy & paste this raw Markdown into a file (e.g., `NAMING_AND_STRUCTURE.md`).

---

# 1. General Principles
- Use **clear, descriptive, intention-revealing names**.
- Prefer **consistency over personal preference**.
- Use **English only**.
- Keep names short but unambiguous.
- Favor **modularity**, separation of concerns and single-responsibility per app/module.
- Follow **language-specific conventions** (Python PEP8, JS/TS idioms).

---

# 2. Naming Conventions (language-specific)

## 2.1 Repo-level directories (cross-language)
- Use **kebab-case** for top-level directories (friendly for CLIs and URLs).
  - Examples: `backend/`, `frontend/`, `infra/`, `docs/`, `scripts/`.

## 2.2 Python / Django conventions
- **Packages & modules (files / folders):** `snake_case` (PEP8).  
  - Examples: `product_listing`, `inventory`, `workflow_logger`.
- **Files:** `snake_case.py`.  
  - Examples: `models.py`, `serializers.py`, `views.py`, `admin.py`, `tasks.py`.
- **Classes:** `PascalCase`.  
  - Examples: `InventoryService`, `ProductListingSerializer`.
- **Functions & variables:** `snake_case`.  
  - Examples: `get_product_by_id()`, `raw_material_count`.
- **Constants:** `UPPER_SNAKE_CASE`.  
  - Examples: `MAX_UPLOAD_SIZE`.
- **Django settings:** `settings.py` with environment-specific overrides: `settings/base.py`, `settings/development.py`, `settings/production.py`.
- **Django apps:** name in `snake_case`, single responsibility per app.  
  - Examples: `product_listing`, `inventory`, `communications`.

## 2.3 JavaScript / TypeScript (frontend) conventions
- **Directories:** `kebab-case`.  
- **React component files:** `PascalCase.tsx` (component = filename).  
  - Example: `ProductCard.tsx`.
- **Non-component JS files / utilities / services:** `PascalCase.ts`.  
  - Example: `product-service.ts`.
- **Variables & functions:** `camelCase`.  
- **Constants:** `UPPER_SNAKE_CASE`.
- **Types & Interfaces:** `PascalCase` (no `I` prefix).

## 2.4 API routes & URLs
- Use **kebab-case** for public REST endpoints (readable and consistent with URLs).  
  Examples:

## 2.5 Classes, Interfaces and Types
- Classes & Interfaces & Types: PascalCase
Example: `InventoryService`, `ProductListing`, `RawMaterial`
- Interfaces: prefer PascalCase without I prefix (modern TS style).
Example: `interface ProductListing { ... }`

## 2.6 API endpoints and routes
- Use kebab-case for paths and resource nouns for REST routes.
Examples:
```
GET  /api/products
POST /api/products
GET  /api/products/:id
GET  /api/inventory/raw-materials
```

## 2.7 Git branches
kebab-case grouped by type:
Examples:
```
feature/product-workflow-logger
fix/listing-sync-bug
chore/update-deps
perf/inventory-cache
```

# 3. File & Code Organization Principles
- One responsibility per file (single export when possible).
- Prefer named exports for utilities; default export only for primary component/class.
- Keep domain code grouped (feature-first structure) rather than large global folders of unrelated files.
- Keep adapters/integrations isolated behind an interface to allow easy mocking and replacement.