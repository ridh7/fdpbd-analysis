.PHONY: setup dev test lint clean setup-backend setup-frontend test-backend test-frontend lint-backend lint-frontend typecheck

setup: setup-backend setup-frontend

setup-backend:
	cd backend && python3 -m venv .venv
	cd backend && .venv/bin/pip install -e ".[dev,test]"

setup-frontend:
	cd frontend && pnpm install

dev:
	pnpm dev

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest -v --cov=app

test-frontend:
	cd frontend && pnpm test run

lint: lint-backend lint-frontend

lint-backend:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app

lint-frontend:
	cd frontend && pnpm lint && pnpm tsc --noEmit

typecheck:
	cd backend && .venv/bin/mypy app
	cd frontend && pnpm tsc --noEmit

clean:
	rm -rf backend/.venv backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/node_modules frontend/dist
