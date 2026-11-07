#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then echo "Python 3 is required"; exit 1; fi
if [[ ! -d .venv ]]; then python3 -m venv .venv; fi
.venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt
if [[ ! -f .env ]]; then cp .env.example .env; echo "Created .env from template. Add your Gemini key to activate AI features."; fi
printf '\nMock Preparation AI is starting at http://127.0.0.1:8000\n'
.venv/bin/python -m uvicorn server:app --env-file .env --host 127.0.0.1 --port 8000 --reload
