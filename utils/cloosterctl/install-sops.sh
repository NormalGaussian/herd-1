#!/bin/bash

# Check if sops is already installed
if [[ -e "$HOME/bin/sops" ]]; then
  echo "sops is already installed"
  exit 0
fi

# Create a temporary directory
TEMP_DIR="$(mktemp -d)"
mkdir -p "$TEMP_DIR"
TEMP_FILE="$TEMP_DIR/sops"

# Download the sops binary
curl -L -o "$TEMP_FILE" "https://github.com/getsops/sops/releases/download/v3.9.1/sops-v3.9.1.linux.amd64"

# Verify the file
hash=$(sha256sum "$TEMP_FILE" | cut -d ' ' -f 1)
if [[ "$hash" != "cd795109851c3a483bbaa66d15d19ddb2227ac0352b39e25d96b67d51edb6225" ]]; then
  echo "sops binary checksum failed"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Copy to the users bin directory
mkdir -p $HOME/bin
mv "$TEMP_FILE" "$HOME/bin/sops"
rm -rf "$TEMP_DIR"
