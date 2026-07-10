# CentOS Deployment Installer Design

## Goal

Build a production deployment path for a CentOS cloud host that reduces first-install failures, avoids packaging local runtime residue, and provides a locked installation wizard for environment checks, database creation, baseline data import, and admin setup.

## Deployment Model

The recommended deployment model is native CentOS deployment:

- Nginx serves the built frontend and proxies `/api` to the backend.
- The backend runs as a Node.js systemd service.
- MySQL stores application data.
- Python, Playwright, and system Chrome/Chromium are installed on the server instead of being bundled into the project.
- Ozon Python scripts are shipped as source under `backend/scripts/ozon`, but browser profiles, cookies, caches, screenshots, and result files are not shipped.

Docker can be added later, but it is not the primary path for this iteration because the current project already expects local filesystem paths, Python scripts, and browser automation.

## Package Rules

The deploy package should include:

- `backend/dist`
- `backend/package.json`
- `backend/package-lock.json` if present
- `backend/prisma/schema.prisma`
- `backend/scripts/ozon/*.py`
- `backend/scripts/data/.gitkeep` or an empty runtime data directory
- `frontend/dist`
- deployment scripts and docs
- optional baseline seed bundle files under a controlled directory such as `deploy/seed-bundles`

The deploy package must exclude:

- `node_modules`
- `frontend/src`, except when building on the server is explicitly chosen
- `backend/src`, except when building on the server is explicitly chosen
- `backend/.env`, `frontend/.env`
- `backend/data/ozon_cookies.json`
- `backend/scripts/data/ozon_cookies.json`
- `backend/scripts/data/cache`
- `backend/scripts/data/ozon_type_cache.json`
- `backend/scripts/data/_ozon_*_result.json`
- `backend/scripts/data/_chrome_profile*`
- `backend/scripts/ozon/_chrome_profile*`
- `backend/scripts/ozon/__pycache__`
- debug screenshots and local temporary files
- test reports, local logs, and temporary images

## Database Initialization Data

The installer should separate data into three groups.

### System Required Data

These are always created during installation:

- `roles`: system roles and permissions.
- `users`: the first admin user only.
- `ozon_config`: default Ozon preference settings such as search limit and cache hours.

The production seed must not create:

- `test_seller`
- sample products
- sample stores
- sample orders
- sample payment records
- local Ozon cookies

### Slow-Changing Baseline Data

These should be importable through a versioned baseline data bundle:

- `ozon_categories`: Ozon category tree.
- `ozon_product_templates`: cached Ozon product templates by description category and type.
- `ozon_category_attributes`: Ozon category attributes.
- `ozon_attribute_values`: Ozon dictionary values for attributes.
- `ozon_error_codes`: known Ozon error translations and status translations.

These tables are useful to preserve because they are slow to fetch, mostly stable, and improve first-use behavior. They should not be treated as user business data.

The installer should support two modes:

- Import bundled baseline data if a bundle file exists.
- Skip baseline data and allow the admin to sync it later from the system settings.

### Runtime Private Data

These are never packaged as initial data:

- `ozon_stores`
- API keys and store credentials
- user tokens
- Ozon cookies
- search cache JSON files
- type extraction cache JSON files
- products, orders, finance records, source collection records, uploaded images, chat records, and sync logs

These must be created by the user after deployment or fetched from real APIs.

## Installer Locking

The installer must be unavailable after completion.

Use both locks:

- File lock: `backend/data/install.lock`
- Database lock: a row in `ozon_config` or a dedicated installer metadata field if added later

Rules:

- If neither lock exists, `/install` and `/api/install/*` are available.
- If either lock exists, installation status returns `installed: true`, and mutating install endpoints reject requests.
- `INSTALL_ALLOW_RESET=true` may allow reset on a private maintenance session, but it should default to false.

## Installer API

Create unauthenticated install endpoints that are explicitly exempted from the global auth middleware:

- `GET /api/install/status`
  - Returns whether installation is locked and what checks are still required.
- `POST /api/install/check`
  - Checks Node runtime, backend writable directories, MySQL connection input, Python availability, Playwright import, and Chrome/Chromium availability.
- `POST /api/install/database`
  - Receives database host, port, name, username, password, and writes a production `.env` or `.env.local` style backend config.
  - Creates the database if missing.
  - Runs Prisma schema deployment.
- `POST /api/install/baseline-data`
  - Imports selected baseline bundle tables.
  - Reports imported table counts.
- `POST /api/install/admin`
  - Creates or updates the first admin user.
- `POST /api/install/finalize`
  - Verifies database connectivity and required records.
  - Writes `install.lock`.

All install endpoints should avoid logging passwords, API keys, cookies, or full connection strings.

## Installer UI

Add a frontend route:

- `/install`

The page should use a step-based wizard:

1. Environment check
2. Database configuration
3. Schema creation
4. Baseline data import
5. Admin account creation
6. Finalize and lock

The UI should clearly distinguish:

- fatal blockers: cannot continue
- warnings: can continue, but some features may not work yet
- optional baseline data: recommended but not mandatory

## Browser And Script Strategy

Do not package browser binaries or local profiles.

CentOS deployment should install:

- Python 3
- Python package `playwright`
- Playwright browser dependencies
- system Chrome/Chromium

The backend should find browser executables through a Linux-aware lookup:

- `CHROME_PATH` environment variable
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- Playwright bundled Chromium fallback

The deploy checks should verify that the Ozon scripts can import Playwright and start a headless browser.

## Runtime Directory Strategy

The installer or startup script creates these directories:

- `backend/data`
- `backend/scripts/data`
- `backend/scripts/data/cache`
- `backend/public/uploads`
- `frontend/public/images` if local image hosting remains enabled
- `logs`

All runtime directories should be writable by the backend service user.

## Security Notes

- Default `.env` values must not contain real Ozon keys or local passwords.
- The installer should require the admin to set a new JWT secret or generate one automatically.
- The default admin password must be user-supplied, not hardcoded to `admin123`.
- CORS should be configured from an environment variable instead of a hardcoded IP.
- The install route must not allow reinitialization once locked.

## Testing Strategy

Add script tests for:

- deploy package excludes local runtime files
- production seed excludes demo users and sample products
- baseline data importer accepts known tables and rejects runtime private tables
- install status respects file lock
- browser lookup includes Linux paths and `CHROME_PATH`

Run final verification:

- backend build
- frontend build
- unified script tests
- console audit
- route smoke for `/install` before lock

