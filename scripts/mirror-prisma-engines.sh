#!/usr/bin/env bash
# Download Prisma engine binaries from binaries.prisma.sh and upload to Artifactory.
#
# Run from a machine with internet access to binaries.prisma.sh and deploy permission
# on operations_innovation-generic-dev-local.
#
# Auth:
#   export ARTIFACTORY_API_KEY="your-jfrog-api-key-or-reference-token"
#   ./scripts/mirror-prisma-engines.sh
#
# Optional: load from a file (gitignored):
#   ARTIFACTORY_ENV_FILE=../prisma-download/.env.artifactory ./scripts/mirror-prisma-engines.sh
#
# Re-run after upgrading prisma / @prisma/client (engine hash changes).
#
# Manual upload (Option B), after files are in ./prisma-engines-mirror/:
#   REPO="operations_innovation-generic-dev-local"
#   ARTIFACTORY="https://case.artifacts.medtronic.com/artifactory"
#   STAGING_DIR="./prisma-engines-mirror"
#   find "${STAGING_DIR}/all_commits" -type f | while read -r file; do
#     rel="${file#${STAGING_DIR}/}"
#     curl -H "X-JFrog-Art-Api: ${ARTIFACTORY_API_KEY}" \
#       -f -T "${file}" \
#       "${ARTIFACTORY}/${REPO}/${rel}"
#   done

set -euo pipefail

ARTIFACTORY_BASE="${ARTIFACTORY_BASE:-https://case.artifacts.medtronic.com/artifactory}"
ARTIFACTORY_REPO="${ARTIFACTORY_REPO:-operations_innovation-generic-dev-local}"
PRISMA_SOURCE="${PRISMA_SOURCE:-https://binaries.prisma.sh}"
ARTIFACTORY_ENV_FILE="${ARTIFACTORY_ENV_FILE:-}"

# Prisma 6.12.0 — update when pnpm-lock.yaml @prisma/engines-version changes
ENGINE_HASH="${ENGINE_HASH:-8047c96bbd92db98a2abc7c9323ce77c02c89dbc}"

PLATFORMS=(
  "debian-openssl-3.0.x"
  "linux-musl-openssl-3.0.x"
)

ENGINES=(
  "libquery_engine.so.node"
  "schema-engine"
  "prisma-fmt"
)

if [[ -z "${ARTIFACTORY_API_KEY:-}" && -n "${ARTIFACTORY_ENV_FILE}" && -f "${ARTIFACTORY_ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ARTIFACTORY_ENV_FILE}"
  set +a
fi

STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "${STAGING_DIR}"' EXIT

artifactory_curl() {
  if [[ -z "${ARTIFACTORY_API_KEY:-}" ]]; then
    echo "Set ARTIFACTORY_API_KEY to your JFrog API key or reference token." >&2
    exit 1
  fi

  curl -H "X-JFrog-Art-Api: ${ARTIFACTORY_API_KEY}" "$@"
}

verify_artifactory_auth() {
  local response
  local status

  response="$(mktemp)"
  status="$(artifactory_curl -sS -o "${response}" -w "%{http_code}" "${ARTIFACTORY_BASE}/api/system/ping")"

  if [[ "${status}" == "200" ]]; then
    rm -f "${response}"
    echo "Artifactory auth OK (X-JFrog-Art-Api)"
    return 0
  fi

  echo "Artifactory authentication failed (HTTP ${status})." >&2
  if [[ -s "${response}" ]]; then
    cat "${response}" >&2
  fi
  rm -f "${response}"
  echo "" >&2
  echo "Tips:" >&2
  echo "  export ARTIFACTORY_API_KEY=\"your-api-key\"" >&2
  echo "  curl -H \"X-JFrog-Art-Api: \${ARTIFACTORY_API_KEY}\" ${ARTIFACTORY_BASE}/api/system/ping" >&2
  echo "  Confirm deploy/write access to ${ARTIFACTORY_REPO}." >&2
  exit 1
}

upload_to_artifactory() {
  local file="$1"
  local target="$2"
  local response
  local status

  response="$(mktemp)"
  status="$(artifactory_curl -sS -o "${response}" -w "%{http_code}" -T "${file}" "${target}")"

  if [[ "${status}" == "201" || "${status}" == "200" ]]; then
    rm -f "${response}"
    return 0
  fi

  echo "Upload failed (HTTP ${status}): ${target}" >&2
  if [[ -s "${response}" ]]; then
    echo "Artifactory response:" >&2
    cat "${response}" >&2
  fi
  rm -f "${response}"
  return 1
}

echo "Checking Artifactory credentials..."
verify_artifactory_auth

echo "Staging directory: ${STAGING_DIR}"
echo "Engine hash: ${ENGINE_HASH}"
echo "Target: ${ARTIFACTORY_BASE}/${ARTIFACTORY_REPO}"

for platform in "${PLATFORMS[@]}"; do
  for engine in "${ENGINES[@]}"; do
    rel="all_commits/${ENGINE_HASH}/${platform}/${engine}.gz"
    src="${PRISMA_SOURCE}/${rel}"
    dest="${STAGING_DIR}/${rel}"

    mkdir -p "$(dirname "${dest}")"
    echo "Downloading ${rel}"
    curl -fsSL "${src}" -o "${dest}"

    sha_src="${src}.sha256"
    sha_dest="${dest}.sha256"
    if curl -fsSL "${sha_src}" -o "${sha_dest}" 2>/dev/null; then
      echo "  + checksum"
    fi
  done
done

echo "Uploading to Artifactory..."
find "${STAGING_DIR}/all_commits" -type f | while read -r file; do
  rel="${file#${STAGING_DIR}/}"
  target="${ARTIFACTORY_BASE}/${ARTIFACTORY_REPO}/${rel}"
  echo "  ${rel}"
  upload_to_artifactory "${file}" "${target}"
done

echo "Done. Verify with:"
echo "  curl -H \"X-JFrog-Art-Api: \${ARTIFACTORY_API_KEY}\" -I \"${ARTIFACTORY_BASE}/${ARTIFACTORY_REPO}/all_commits/${ENGINE_HASH}/debian-openssl-3.0.x/libquery_engine.so.node.gz\""
echo ""
echo "CI mirror URL (already set in .gitlab-ci.yml):"
echo "  PRISMA_ENGINES_MIRROR=${ARTIFACTORY_BASE}/${ARTIFACTORY_REPO}"
