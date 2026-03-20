#!/bin/bash

MODE="${1:-apply}"
DIR="${2:-}"

BY_FILE=true

shift
shift

ARGS="$@"
while [[ "$#" -gt 0 ]]; do
    shift
done

error() {
    echo "$1" >&2
    exit 1
}

if [[ -z "$DIR" ]]; then
    error "Directory not specified"
    error "Usage: $0 <apply|delete> <dir>"
    exit 1
fi

if [[ ! "$MODE" =~ ^(apply|delete|create)$ ]]; then
    error "Invalid mode: $MODE"
    error "Usage: $0 <apply|delete|create> <dir>"
    exit 1
fi

FILES="$(find "$DIR" -type f -name "*.yaml" | sort)"
if [[ -z "$FILES" ]]; then
    error "No YAML files found in $DIR"
    exit 1
else
    N=$(echo "$FILES" | wc -l)
    echo "\`kubectl $MODE\` for $N files:"
    echo "$FILES"
fi

declare -a FILE_ARGS

add_files() {
    if [[ -n "${1:-}" ]]; then
        if $BY_FILE; then
            echo "Adding files: $1"
            read -r -d '' -a FILE_LIST <<< "$1"
            for FILE in "${FILE_LIST[@]}"; do
                if [[ -e "$FILE" ]]; then
                    FILE_ARGS+=("$(sed 's/^/-f /' <<< "$FILE")")
                    echo "Adding file: $FILE"
                else
                    echo "File not found: $FILE"
                fi
            done
        else
            FILE_ARGS+=("$(sed 's/^/-f /' <<< "$1" | xargs)")
        fi
    fi
}

add_non_batch_files() {
    add_files "$(echo "$FILES" | grep -v '^\d{2}-')"
}

add_batch_files() {
    SORT_FLAGS_FOR_BATCH_DIRECTION=""
    if [[ "$MODE" == "delete" ]]; then
        SORT_FLAGS_FOR_BATCH_DIRECTION="-r"
    fi
    BATCHES=$(echo "$FILES" | grep -oP '^\d{2}-' | sort -u $SORT_FLAGS_FOR_BATCH_DIRECTION)
    for BATCH in $BATCHES; do
        add_files "$(echo "$FILES" | grep "^$BATCH")"
    done
}

# Add files in the correct order
if [[ "$MODE" == "delete" ]]; then
    add_non_batch_files
fi
add_batch_files
if [[ "$MODE" != "delete" ]]; then
    add_non_batch_files
fi

# Apply or delete the files
SKIP=false
for FILE_ARG in "${FILE_ARGS[@]}"; do
    if $SKIP; then
        echo "Skipping: kubectl $MODE $FILE_ARG"
        continue
    fi

    echo "Running: kubectl $MODE $FILE_ARG $ARGS"
    if ./kubectl "$MODE" $FILE_ARG $ARGS; then
        echo "Success"
    else
        echo "Failed ($?): $MODE $FILE_ARG"
        if [[ "$MODE" != "delete" ]]; then
            SKIP=true
            EXIT_CODE=1
        fi
    fi
    sleep 2
done

exit ${EXIT_CODE:-0}
