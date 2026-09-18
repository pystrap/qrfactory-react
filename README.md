# QRFactory web

A React + TypeScript + Bootstrap frontend for the QRFactory Django API. The same API serves the website and mobile app. This directory is a standalone repository with its own dependencies, lockfile, branding, configuration, and browser tests.

## Features

- Responsive landing page with a search-style generator, original vector logo/favicon, locally bundled fonts, use-case cards, and FAQs.
- Instant guest generation without registration or server-side persistence. PNG and scalable SVG downloads.
- Website, text, Wi-Fi, contact/vCard, email, SMS, phone, and map-location forms.
- File QR codes for PDFs, Office documents, images, video, and audio.
- Color presets/custom colors, resolution, and error correction.
- Registration/login, automatic access-token refresh, logout, session-scoped storage, and guest draft retention through the chosen signup/login flow.
- Saved-code workspace: search, content/project filters, favorites, pagination, duplication, naming, downloads, and confirmed deletion.
- Dynamic website destinations, pause/resume, expiry, permanent-link copying, and 30-day scan charts.
- Projects with create/edit/delete and QR assignment.
- File library: upload, rename, replacement preserving QR links, download, storage usage, and deletion protection for referenced files.
- Public shared-content pages with image/video/audio previews and downloads, plus clear unavailable-link states.
- Loading/empty/error states, labelled forms, keyboard navigation, responsive workspace navigation, reduced-motion support, and tested text contrast.

## Run locally

Use Node.js 22.12+ and npm (tested with Node 24). Start Django first, following its README:

```powershell
cd ..\django
docker compose -f docker-compose.dev.yml up -d
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

In another terminal, from this `react` directory:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

For macOS/Linux use `cp .env.example .env` and the appropriate virtual-environment executable. Open **http://localhost:5173**. PostgreSQL runs in Docker; Django and React run on the host. Create an account in the UI; there are no frontend mock accounts or mock data.

### Environment

| Variable            | Default                 | Purpose                                                                    |
| ------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                  | Browser API base; use `https://api.example.com/api` if deployed separately |
| `VITE_PROXY_TARGET` | `http://127.0.0.1:8000` | Local Vite `/api` and `/media` proxy target                                |
| `VITE_SITE_URL`     | Browser origin          | Canonical web origin; example file uses `http://localhost:5173`            |
| `VITE_DEV_PORT`     | `5173`                  | Development port                                                           |

Only public values belong in `VITE_*`; they are bundled into browser assets. Rebuild after changing production values. Never put database or JWT secrets here.

In Django set `BASE_URL` for QR images, `PUBLIC_BASE_URL` for dynamic links, and `WEB_BASE_URL` for shared-file pages. They must be reachable by scanning phones. For physical-device testing use your computer's LAN IP, bind Django to `0.0.0.0`, and configure `ALLOWED_HOSTS`/browser CORS origins. The backend `.env.example` also documents upload limits.

## Pages

| Route                 | Page                                                       |
| --------------------- | ---------------------------------------------------------- |
| `/`                   | Landing and guest generator                                |
| `/create`             | QR studio; `?type=wifi`, `?type=media`, etc. select a type |
| `/register`, `/login` | Account creation/sign-in                                   |
| `/library`            | Saved codes; `?project={id}` opens a project collection    |
| `/projects`           | Project management                                         |
| `/files`              | File library and storage usage                             |
| `/account`            | Account details/sign-out                                   |
| `/share/{uuid}`       | Public uploaded-content page                               |

Management screens prompt guests to sign in. Static generation remains public. Hosting uploads and dynamic links require an account.

## API and mobile integration

`src/api.ts` centralizes configurable URLs, bearer headers, structured errors, single-flight token refresh, and downloads. Tokens live in tab/session-scoped `sessionStorage`; no permanent local storage or auth cookies are used. Prevent XSS because browser JavaScript can access these tokens. Mobile clients should use native secure storage.

Guest previews use `POST /api/qr-codes/preview` and receive an in-memory base64 image. Signed-in creation uses the original `POST /api/qr-codes`. Upload multipart files to `/api/media-assets`, then create a media QR using the asset's `media_id`. Dynamic QR codes encode `/api/public-links/{uuid}/visit`. Website codes redirect to their destination; media codes open `/share/{uuid}`. Public JSON metadata and range-enabled content remain usable independently by native clients.

The Django README documents every API method, field, permission, example, and error. Existing mobile paths remain supported; new endpoints and fields are additive.

## Build and tests

```sh
npm run build
npm run format:check
npx playwright install chromium
npm run test:e2e
```

Start both servers before browser tests. `E2E_BASE_URL` overrides the web origin. Tests use the real API/database, create uniquely named `e2e-...@example.com` accounts, and clean up their codes/files/projects. Test accounts remain for inspection. Run against development/test instances, never production. Tests cover desktop Chromium and an iPhone-sized Chromium viewport, not real Safari.

Coverage: guest PNG/SVG downloads, signup/draft retention, favorites/duplication/deletion, projects, dynamic edits/pause, upload/replacement/public downloads, actual image rendering and WebM playback, error states, responsive overflow, and automated WCAG checks on public landing/login pages. Ignored `test-results/` stores screenshots/failure traces; `playwright-report/` contains the HTML report.

`npm run format` formats maintained files. `npm run build` type-checks and builds `dist/`.

## Deploy

1. Set production environment values and build.
2. Deploy `dist/` over HTTPS. Serve existing route files first (`/create/index.html`, `/pricing/index.html`, `/batch/index.html`, `/how-it-works/index.html`); use `200.html` for account/share routes. Do not rewrite every request to the homepage. See `deploy/nginx-static.conf`; `_redirects` supports hosts using Netlify-style SPA fallbacks.
3. Proxy `/api` to Django or configure the absolute API base and backend CORS. Vite's development proxy is absent from a production build or preview server.
4. Configure Django's public/API/web origins before printing codes. Keep old printed hostnames working when moving hosts.
5. Serve generated QR images publicly; keep uploaded originals behind the API. Configure durable backups, request-size limits, shared throttling, and malware/abuse controls as described in the Django README.

This is a functional full-stack implementation, not a deployment service. Email verification/password recovery, team invitations, custom domains, and malware scanning are not implemented. Scan counts include repeated requests and bots; they are not unique visitor counts. Static scans cannot be counted or revoked.

## Structure

```text
public/logo.svg          Original vector logo and favicon
src/api.ts               API client and session handling
src/context.tsx          Account state and notifications
src/components.tsx       Shared navigation, workspace, dialogs, states
src/pages/               All application screens
src/styles.css           Responsive Bootstrap customization
src/readability.css      Contrast and mobile-legibility refinements
src/types.ts             API response types
tests/platform.spec.ts   Real full-stack browser tests
```

Uses [React Bootstrap](https://react-bootstrap.github.io/docs/getting-started/introduction/) and [Vite](https://vite.dev/guide/). Fonts ship locally; no third-party font CDN is required.

## Memberships and billing

The studio and workspace display server-provided allowances. `/pricing` contains the Free/Pro comparison, enabled weekly/monthly/yearly prices, Stripe Checkout, confirmation and billing management. The server supplies all prices and entitlements; no Stripe secret or publishable key is needed in the browser because Checkout is hosted by Stripe. Account creation from pricing returns to pricing. Generator drafts remain in session storage across signup.

Configure `VITE_API_BASE_URL` for the backend and `VITE_SITE_URL` for canonical URLs. The API base must use HTTPS in production; cryptographic UUIDs and the browser lock API work in secure contexts. Browser device tokens live in localStorage; authentication tokens and drafts remain in sessionStorage. Clearing browser storage changes the browser's device identity.

Before deployment, follow [the backend billing and cWeb rollout guide](../django/BILLING_AND_DEPLOYMENT.md). Pro sales remain unavailable until credentials and enabled admin prices are configured. Store subscription clients have not been implemented.

### Local end-to-end tests

Use a disposable backend only. Start from the `django` directory:

```sh
python manage.py migrate --settings=core.test_settings
python manage.py runserver 127.0.0.1:8000 --settings=core.test_settings --noreload
```

Then in `qrfactory-react`, install the locked dependencies and run Vite in another terminal:

```sh
npm ci
VITE_API_BASE_URL=/api npm run dev -- --host 127.0.0.1
```

Install Playwright's Chromium/browser dependencies for your environment, then run:

```sh
E2E_DJANGO_PYTHON=/absolute/path/to/venv/bin/python npm run test:e2e
npm run build
```

The suite runs at desktop and iPhone widths. It verifies device persistence, account gates, daily allowance, website exemption, signup/draft retention, files, dynamic links and accessibility. File tests use a guarded local fixture command to provide Pro entitlement; that command rejects production settings and non-test accounts. Provider verification, checkout and lifecycle events are tested in Django with mocked provider APIs; complete real Stripe/Apple/Google sandbox checks after configuring those accounts.

## QR design, batch generation and public guides

`src/DesignControls.tsx` is shared by the individual studio and `/batch`. Logos and captions are Pro-only and validated by the server; the UI starts with a matching icon and offers sanitized image upload. A smaller Generate button applies changes without scrolling back to the main action. All content types are visible on phones, and optional colors/resolution and workspace settings expand separately.

`/batch` offers public CSV/Excel samples, Pro spreadsheet preview, design settings, queued generation, progress, cancellation and private ZIP download/deletion. Signup/login from the batch page return to `/batch`. The backend worker must run separately; see [the batch deployment guide](../django/QR_DESIGN_AND_BATCHES.md). `/how-it-works` explains every supported type, design option, batch format, plan and workspace capability.

## Search and sharing

Set `VITE_SITE_URL` to the canonical HTTPS origin (for example `https://qrfactory.net`). The production build fails if this is missing or is a localhost/non-HTTPS origin. Build-time React rendering writes real public HTML for `/`, `/create`, `/pricing`, `/batch`, and `/how-it-works`; no API credentials or live prices are embedded during the build. The client then starts the interactive app and retrieves current plans/allowances.

Each public page has its own title, description, canonical, Open Graph/Twitter card and WebApplication/WebSite/breadcrumb structured data. The build emits `sitemap.xml`, `robots.txt` and a `200.html` noindex shell for account/shared-content routes. The sitemap contains only canonical public routes, not query parameters or private/user content. `public/social.png` is the shared social preview; its reproducible browser-based generator is `scripts/generate-social.mjs`.

Serve the prerendered files before the SPA fallback. Verify a direct request to `/how-it-works` returns its guide text/title without JavaScript, and `/share/...` returns the noindex shell. Configure HTTPS and a single www/non-www canonical host at your edge, submit the sitemap in Search Console, and keep page copy accurate as the product changes. Search visibility and indexing speed are controlled by search engines; metadata does not guarantee a ranking.

The end-to-end suite includes desktop/mobile tests for Pro design uploads/downloads, real batch processing, public guides, signup return paths, accessibility and layout. The worker tests use `core.test_settings`; never point them at production. Production HTML/sitemap checks run automatically at the end of `npm run build`.
