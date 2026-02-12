# Repository Guidelines

## Project Structure & Module Organization
- `cmd/server/main.go`: backend entrypoint.
- `internal/`: core backend code by concern (`handlers`, `middleware`, `services`, `models`, `database`, `config`, `cache`).
- `pkg/`: reusable packages (`auth`, `logger`, `metrics`).
- `migrations/`: ordered SQL migrations (`NNN_description.up.sql` and `NNN_description.down.sql`).
- `frontend/`: React + TypeScript admin app (`src/components`, `src/pages`, `src/hooks`, `src/services`, `src/types`).
- `monitoring/`: Prometheus and Grafana provisioning/dashboards.

## Build, Test, and Development Commands
- `make dev`: start local PostgreSQL and Valkey containers.
- `make migrate-up`: apply DB migrations (requires `DATABASE_URL`).
- `make run`: run backend locally on `:8080`.
- `make build`: build backend binary to `bin/authy`.
- `make test` / `make test-coverage`: run Go tests and coverage report.
- `make lint` / `make format`: run `golangci-lint`, `go fmt`, and `goimports`.
- `cd frontend && npm install && npm run dev`: run frontend on `:3001`.
- `cd frontend && npm run lint && npm run build`: validate and build frontend.

## Coding Style & Naming Conventions
- Go style is enforced by `gofmt`/`goimports`; run `make format` before opening a PR.
- Keep Go package names lowercase and concise; exported identifiers use `PascalCase`.
- React components and pages use `PascalCase` filenames (example: `UsersPage.tsx`); hooks use `camelCase` with `use` prefix (example: `useUsers.ts`).
- Keep feature logic grouped by domain (users, roles, permissions, audit, analytics) across backend handlers and frontend pages/services.

## Testing Guidelines
- Backend tests use Go’s standard testing tools (`go test ./...`), with files named `*_test.go` next to implementation files.
- No strict coverage threshold is currently enforced, but run `make test-coverage` and avoid reducing coverage in touched packages.
- Frontend has lint/build checks configured; if UI behavior changes, include manual verification steps in the PR.

## Commit & Pull Request Guidelines
- Follow existing history style: short, imperative commit subjects like `Add ...`, `Fix ...`, `Update ...`.
- Keep commits focused and atomic; separate refactors from behavior changes.
- PRs should include: summary, linked issue (if any), migration/config impacts, verification commands, and screenshots for frontend changes.

## Security & Configuration Tips
- Start from `.env.example`; never commit secrets or production credentials.
- Change default admin credentials and rotate `JWT_SECRET` outside local development.
- Regenerate Swagger docs with `make swagger` when API contracts or annotations change.
