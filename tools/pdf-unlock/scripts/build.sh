#!/usr/bin/env bash
# Builds the pdf-unlock WASM into app/src/wasm/pdf-unlock and stamps its source hash.
# The build is reproducible on the same host platform, so CI rebuilds it on
# macOS arm64 (like the Apple Silicon Mac it's committed from) and fails if the
# committed files differ.
set -euo pipefail
cd "$(dirname "$0")/.."

# Prefer rustup's proxies so rust-toolchain.toml is honoured (Homebrew's cargo ignores it).
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

# wasm-pack picks the wasm-bindgen and wasm-opt versions, so it's part of the build.
WASM_PACK_VERSION=0.15.0
if [ "$(wasm-pack --version)" != "wasm-pack $WASM_PACK_VERSION" ]; then
  echo "error: need wasm-pack $WASM_PACK_VERSION (found: $(wasm-pack --version))" >&2
  exit 1
fi

# Strip machine-specific paths (they end up in panic locations) so every
# machine produces byte-identical output.
export RUSTFLAGS="--remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo --remap-path-prefix=$PWD=/pdf-unlock"

OUT=../../app/src/wasm/pdf-unlock
wasm-pack build --release --target web --out-dir "$OUT" --out-name pdf_unlock
# wasm-pack emits npm packaging we don't use; its .gitignore ("*") would hide the build from git.
rm -f "$OUT/.gitignore" "$OUT/package.json" "$OUT/README.md"
node scripts/source-hash.mjs --write
