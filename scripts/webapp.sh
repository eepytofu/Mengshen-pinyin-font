#!/bin/sh
# Launch the Mengshen Font Studio webapp (backend + built frontend).
set -e
cd "$(dirname "$0")/.."

PYTHON=${PYTHON:-.venv/bin/python}
if [ ! -x "$PYTHON" ]; then
  echo "error: $PYTHON not found — create a venv first:" >&2
  echo "  python3.11 -m venv .venv && .venv/bin/pip install -e '.[webapp]'" >&2
  exit 1
fi

if [ ! -d webapp/frontend/dist ]; then
  echo "warning: webapp/frontend/dist not found — building frontend..." >&2
  (cd webapp/frontend && npm install && npm run build)
fi

exec "$PYTHON" -m uvicorn webapp.backend.main:app --port "${PORT:-8000}"
