#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/deploy/certs"
CONF_FILE="$CERT_DIR/openssl-localhost.cnf"
KEY_FILE="$CERT_DIR/localhost-key.pem"
CERT_FILE="$CERT_DIR/localhost-cert.pem"

mkdir -p "$CERT_DIR"

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -days 365 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$CONF_FILE" \
  -extensions v3_req

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "Generated:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
