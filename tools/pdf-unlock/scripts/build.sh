#!/usr/bin/env bash
# Builds the pdf-unlock WASM into app/src/wasm/pdf-unlock and stamps its source hash.
set -euo pipefail
cd "$(dirname "$0")/.."

# Prefer rustup's proxies so rust-toolchain.toml is honoured (Homebrew's cargo ignores it).
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

OUT=../../app/src/wasm/pdf-unlock
wasm-pack build --release --target web --out-dir "$OUT" --out-name pdf_unlock
# wasm-pack emits npm packaging we don't use; its .gitignore ("*") would hide the build from git.
rm -f "$OUT/.gitignore" "$OUT/package.json" "$OUT/README.md"
node scripts/source-hash.mjs --write
