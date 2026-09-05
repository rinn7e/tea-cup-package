# Tea-Cup Link-Pagination Example App Monorepo Makefile

SHELL := /bin/bash

.DEFAULT_GOAL := build

.PHONY: build watch run-backend server server-fresh server-prod resetdb seed test lint format migrate-generate migrate-up migrate-up-one migrate-down-one migrate-status run-fe check-fe test-fe lint-fe

# Fast compile check for Haskell packages
build:
	@chmod +x ./my-scripts/build.sh
	./my-scripts/build.sh

# Build and watch for file changes
watch:
	@chmod +x ./my-scripts/watch.sh
	./my-scripts/watch.sh

# Run backend API server
run-backend:
	stack exec example-app-backend-exe

# Compile and run dev-mode services (backend + frontend)
server:
	$(MAKE) build
	@chmod +x ./my-scripts/server.sh
	./my-scripts/server.sh

# Reset databases, migrate, seed, and run dev server
server-fresh:
	$(MAKE) build
	@chmod +x ./example-app-backend/script/resetdb.sh
	./example-app-backend/script/resetdb.sh
	$(MAKE) migrate-up
	$(MAKE) seed
	$(MAKE) server

# Compile frontend and run server in production mode
server-prod:
	@chmod +x ./example-app-backend/script/server-prod.sh
	./example-app-backend/script/server-prod.sh

# Reset PostgreSQL database
resetdb:
	@chmod +x ./example-app-backend/script/resetdb.sh
	./example-app-backend/script/resetdb.sh

# Populate database with seed data
seed:
	psql "$${DB_CONN:-host=localhost dbname=tea_cup_link_pagination_example_app user=postgres password=postgres port=5432}" -f example-app-backend/resource/seed/seed.sql

# Database & Migration targets
migrate-generate:
	@if [ -z "$(NAME)" ]; then echo "Error: NAME is required. Usage: make migrate-generate NAME=some_name"; exit 1; fi
	cd example-app-backend && stack build --fast && stack exec migrate-exe -- generate $(NAME)

migrate-up:
	cd example-app-backend && stack build --fast && stack exec migrate-exe -- up

migrate-up-one:
	cd example-app-backend && stack build --fast && stack exec migrate-exe -- up-one

migrate-down-one:
	cd example-app-backend && stack build --fast && stack exec migrate-exe -- down-one

migrate-status:
	cd example-app-backend && stack build --fast && stack exec migrate-exe -- status

# Run test suites
test:
	@chmod +x ./my-scripts/test.sh
	./my-scripts/test.sh

# Lint & format backend code
lint:
	cd example-app-backend && hlint src app test

format:
	cd example-app-backend && find src app test -name '*.hs' | xargs fourmolu --mode inplace

# Frontend targets
run-fe:
	cd example-app && pnpm dev

check-fe:
	cd example-app && pnpm check

test-fe:
	cd example-app && pnpm test

lint-fe:
	cd example-app && pnpm staged
