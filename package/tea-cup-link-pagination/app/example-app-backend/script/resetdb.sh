#!/usr/bin/env bash
set -e

DB_NAME="${PGDATABASE:-tea_cup_link_pagination_example_app}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "Resetting PostgreSQL database '$DB_NAME'..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists --force "$DB_NAME" || true
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" || true
echo "Database '$DB_NAME' reset successfully!"
