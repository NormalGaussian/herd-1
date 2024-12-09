#!/usr/bin/env bash

set -eou pipefail

DIR="${1:-}"

if [[ -z "$DIR" ]]; then
    echo "Usage: $0 <dir>"
    exit 1
fi

for FILE in $(find "$DIR" -type f | sort -V); do
    echo "Applying $FILE"
    start=$(date +%s)
    ./kubectl apply -f "$FILE"
    end=$(date +%s)
    elapsed=$((end - start))
    echo "Applied $FILE in $elapsed seconds"
    sleep 2
done