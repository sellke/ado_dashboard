#!/bin/sh
set -e

secrets_dir="${SECRETS_DIR:-/config}"
secrets_file="${SECRETS_FILE:-$secrets_dir/application.properties}"

if [ -f "$secrets_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$secrets_file"
  set +a
fi

node node_modules/prisma/build/index.js migrate deploy
exec node server.js
