#!/bin/sh
# Resolve and run a Python dev tool (python, black, isort, flake8, bandit, ...)
# without depending on whichever python3 happens to be first on PATH.
#
# Some developer machines have a broken default python3 (e.g. a pyenv
# install linked against a Homebrew path that moved after an Intel->Apple
# Silicon migration). Hooks that call a bare `python`/`black` inherit that
# breakage. This wrapper instead:
#   1. Prefers this project's own .venv, if it exists (guarantees the
#      exact versions pinned in pyproject.toml, regardless of pyenv/
#      conda/asdf/system python on the developer's machine).
#   2. Falls back to whatever resolves on PATH, so it still works before
#      a .venv is set up (or in environments where tools are installed
#      globally, e.g. some CI images).
#   3. Fails with a clear, actionable message instead of a cryptic dyld/
#      import crash if neither is available.
#
# Usage: scripts/dev-tool.sh <tool> [args...]

set -eu

tool="${1:?usage: dev-tool.sh <tool> [args...]}"
shift

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
venv_bin="$repo_root/.venv/bin/$tool"

if [ -x "$venv_bin" ]; then
    exec "$venv_bin" "$@"
fi

if command -v "$tool" >/dev/null 2>&1; then
    exec "$tool" "$@"
fi

echo "error: '$tool' not found in .venv/bin or on PATH." >&2
echo "  Set up the project venv with:" >&2
echo "    python3.11 -m venv .venv && .venv/bin/pip install -e '.[dev]'" >&2
exit 127
