# PDF Unlock Tool (Rust → WASM) — Design

**Date:** 2026-09-24
**Status:** Approved in chat, pending spec review

## Goal

Add a **Tools** section to the resume site whose first tool removes the password
from a PDF, given the correct password. All processing happens in the visitor's
browser via a WASM module built from Rust in this repo. The file, the password,
and the result are never sent anywhere or persisted.

Success criteria:

- A visitor can open `/tools/pdf-unlock`, pick an encrypted PDF, enter its
  password, and download a decrypted PDF that opens without a password and
  without permission restrictions.
- PDFs that only carry an owner password (open without a password, but restrict
  printing/copying) are unlocked without prompting.
- Supported encryption: RC4 40-bit, RC4 128-bit, AES-128 (AESV2), AES-256
  (R5/R6, AESV3) with the standard security handler.
- No network request carries file bytes or the password. No storage API is used.
- The Cloudflare git integration, the Docker build, and `npm run build` keep
  working without a Rust toolchain.

## Non-goals

- Batch processing, adding encryption, or recovering unknown passwords.
- Certificate-based (public-key) security handlers — reported as unsupported.
- A per-route Content Security Policy (the site is an SPA and `SiteStats`
  already makes cross-origin requests).

## Architecture

```
tools/pdf-unlock/            Rust crate (cdylib + rlib)
  Cargo.toml, Cargo.lock
  rust-toolchain.toml        pins toolchain + wasm32-unknown-unknown target
  src/lib.rs                 wasm-bindgen exports
  src/unlock.rs              pure-Rust core (testable natively)
  tests/fixtures/*.pdf       qpdf-encrypted fixtures
  tests/fixtures/generate.sh regenerates fixtures with qpdf
  tests/unlock.rs            integration tests over fixtures
  scripts/build.sh           wasm-pack build + source hash stamp

app/src/wasm/pdf-unlock/     committed wasm-pack output (--target web)
  pdf_unlock.js, pdf_unlock_bg.wasm, *.d.ts, .source-hash

app/src/tools/pdfUnlock/
  worker.ts                  Web Worker: loads WASM, runs inspect/unlock
  client.ts                  promise API over the worker
app/src/pages/Tools.tsx          /tools index (card grid)
app/src/pages/PdfUnlock.tsx      /tools/pdf-unlock
```

### Rust crate

- Dependencies: `lopdf` (0.45, `default-features = false`,
  `features = ["wasm_js"]`) and `wasm-bindgen`. The inspect result is exposed
  as a small `#[wasm_bindgen]` struct (no serde).
- Release profile: `opt-level = "z"`, `lto = true`, `codegen-units = 1`,
  `panic = "abort"`; wasm-pack runs `wasm-opt`.
- Core API (pure Rust, native-testable):
  - `inspect(bytes: &[u8]) -> Result<Inspection, UnlockError>` where
    `Inspection { encrypted: bool, needs_password: bool }`.
    `needs_password` is false when the document authenticates with the empty
    user password.
  - `unlock(bytes: &[u8], password: &str) -> Result<Vec<u8>, UnlockError>`:
    load, authenticate, decrypt, remove `/Encrypt` from the trailer, save.
- `UnlockError` variants map to stable string codes exposed to JS:
  `NOT_ENCRYPTED`, `WRONG_PASSWORD`, `UNSUPPORTED_ENCRYPTION`,
  `MALFORMED_PDF`.
- WASM exports wrap the core, returning `Uint8Array` / a JS error whose
  `message` is the code.

### Build and freshness

- `npm run build:wasm` (in `app/`) calls `tools/pdf-unlock/scripts/build.sh`,
  which runs `wasm-pack build --release --target web --out-dir
  ../../app/src/wasm/pdf-unlock` and writes `.source-hash`: SHA-256 over the
  crate's `src/**`, `Cargo.toml`, `Cargo.lock`, and `rust-toolchain.toml`
  (sorted paths, deterministic).
- wasm-pack's generated `.gitignore` and `package.json` in the output dir are
  removed; the output is committed.
- Byte-for-byte comparison of the `.wasm` is intentionally avoided: embedded
  host paths differ between macOS and the CI runner.

### CI (`.github/workflows/ci-cd.yml`)

New `wasm` job on `ubuntu-latest`:

1. Toolchain from `rust-toolchain.toml` (rustup is preinstalled), cache cargo.
2. Install pinned `wasm-pack`.
3. `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`.
4. `wasm-pack build` (proves it compiles for wasm32).
5. Recompute the source hash and fail if it differs from the committed
   `app/src/wasm/pdf-unlock/.source-hash` ("run `npm run build:wasm`").

`build` gains `wasm` in `needs`. Dockerfile and wrangler config are unchanged.

### Frontend

- **Routes:** `/tools` and `/tools/pdf-unlock` registered in `App.tsx`, both
  via `React.lazy` + `Suspense` so the WASM and worker are only fetched when
  the tool is opened.
- **Nav:** new item `{ to: '/tools', proLabel: 'Tools', rpgLabel: 'Forge' }`
  with a new pixel `AnvilIcon` in `PixelIcons.tsx`. Page copy goes through
  `useLabels` (pro + RPG variants).
- **Tools index:** a card grid driven by a small in-file array (title,
  description, route, icon) so later tools are one entry each.
- **Worker:** `new Worker(new URL('./worker.ts', import.meta.url),
  { type: 'module' })`. Messages `{ id, op: 'inspect' | 'unlock', bytes,
  password? }`; bytes are transferred, not copied. The worker initializes the
  WASM once and replies `{ id, ok, result | code }`.
- **Client:** `inspectPdf(bytes)` / `unlockPdf(bytes, password)` returning
  promises rejecting with an `UnlockFailure { code }`; any unrecognized error
  (including a worker crash) maps to `MALFORMED_PDF`.
- **Page states:** `idle` → `inspecting` → (`needsPassword` | `unlocking`) →
  `done` | `error`. Wrong password keeps the user on the password step with an
  inline error. `done` shows a download button for `<name>-unlocked.pdf` and a
  "Unlock another" reset.
- **Input:** drag-and-drop zone + file input, `accept="application/pdf"`.
  Non-PDF or unreadable files surface `MALFORMED_PDF`.

### Privacy guarantees

- File read with `File.arrayBuffer()`; bytes go only to the worker.
- No `fetch`/XHR/beacon involving file data or password; no `localStorage`,
  `sessionStorage`, IndexedDB, or cookies.
- Output via `Blob` + `URL.createObjectURL`; the URL is revoked after download
  and on reset/unmount.
- Password lives only in component state; cleared on reset, success, and
  unmount. The worker is terminated on unmount.
- Page shows a short note: processing is local, verify in the network tab,
  link to the source on GitHub.

## Error handling

| Code | Meaning | UI |
|---|---|---|
| `NOT_ENCRYPTED` | PDF has no `/Encrypt` | "This PDF isn't password-protected." |
| `WRONG_PASSWORD` | Neither user nor owner password matched | Inline error on the password field, retry allowed |
| `UNSUPPORTED_ENCRYPTION` | Non-standard/public-key handler or unknown filter | Explain it's not supported |
| `MALFORMED_PDF` | Parse failure, not a PDF, or unexpected error | Generic "couldn't read this file" |

## Testing

- **Rust (`cargo test`):** fixtures generated by qpdf from a small plain PDF:
  RC4-40, RC4-128, AES-128, AES-256, and AES-256 owner-only (empty user
  password). For each: `inspect` result, successful `unlock` with the right
  password yields a document with no `/Encrypt` that loads and has the original
  page count/text, wrong password → `WRONG_PASSWORD`. Plain PDF →
  `NOT_ENCRYPTED`; garbage bytes → `MALFORMED_PDF`.
- **Vitest:** `PdfUnlock` page with `client` mocked — state transitions,
  wrong-password retry, owner-only auto-unlock, download link, reset clears
  state. `Tools` index renders its cards. Navbar test updated for the new item.
- **Manual:** run the dev server, unlock each fixture in the browser, confirm
  the network panel shows only static asset loads.
