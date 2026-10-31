#!/bin/sh
# Set up everything the course needs (macOS, Linux). Add --zephyr, --rust or --all for the optional parts.
cd "$(dirname "$0")" || exit 1
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then
  echo "Python 3 is not installed. macOS: xcode-select --install (or brew install python). Linux: sudo apt install python3 python3-venv"
  exit 1
fi
exec "$PY" tools/setup.py "$@"
