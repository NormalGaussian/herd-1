# split-def

TypeScript CLI tool that splits multi-document YAML files into individual files. Lives in `utils/split_def/`.

## Usage

Requires Node.js >= 23.1.0 (uses `--experimental-strip-types`).

```bash
node --experimental-strip-types utils/split_def/index.ts <file1.yaml> [file2.yaml ...]
```

Multiple files can be passed and will be processed in parallel.

## What It Does

Splits a YAML file containing multiple documents (separated by `---`) into separate numbered files in the same directory.

### Example

Input (`manifests.yaml`):

```yaml
kind: Namespace
metadata:
  name: example
---
kind: Deployment
metadata:
  name: app
```

Output:

- `manifests.1.yaml` — the Namespace
- `manifests.2.yaml` — the Deployment

The part number is inserted before the file extension. The `---` separators are consumed and not written to output files.
