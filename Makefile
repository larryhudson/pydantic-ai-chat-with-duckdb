.PHONY: help dev backend frontend install install-backend install-frontend clean

help:
	@echo "Available commands:"
	@echo "  make dev              - Run both backend and frontend in parallel"
	@echo "  make backend          - Run backend dev server"
	@echo "  make frontend         - Run frontend dev server"
	@echo "  make install          - Install all dependencies"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make clean            - Clean generated files"

dev:
	@echo "Starting backend and frontend..."
	@trap 'kill 0' EXIT; \
	(cd backend && uv run fastapi dev main.py) & \
	(cd frontend && npm run dev) & \
	wait

backend:
	cd backend && uv run fastapi dev main.py

frontend:
	cd frontend && npm run dev

install: install-backend install-frontend

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

clean:
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache
	rm -rf frontend/node_modules
	rm -rf frontend/dist
