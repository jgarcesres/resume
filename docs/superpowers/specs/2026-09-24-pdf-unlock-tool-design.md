# PDF Unlock Tool (Rust → WASM) — Design

**Date:** 2026-09-24
**Status:** Approved (amended 2026-09-24 after the lopdf spike — see “lopdf behavior and workarounds”)

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
  (R5/R6, AESV3) with the standard security handler, via either the user or
  the owner password.
- The tool never emits a corrupted PDF: anything it can't decrypt correctly is
  refused with a clear error.
- No network request carries file bytes or the password. No storage API is used.
- The Cloudflare git integration, the Docker build, and `npm run build` keep
  working without a Rust toolchain.

## Non-goals

- Batch processing, adding encryption, or recovering unknown passwords.
- Certificate-based (public-key) security handlers — reported as unsupported.
- A per-route Content Security Policy (the site is an SPA and `SiteStats`
  already makes cross-origin requests).

## lopdf behavior and workarounds

Verified with a spike against qpdf-generated fixtures (lopdf 0.45.0):

- `Document::load_mem_with_options(bytes, LoadOptions::with_password(pw))` is
  the decryption path; it also transparently decrypts owner-only PDFs (empty
  user password) on a plain `load_mem`.
- **Bug 1 — owner password, revision ≤ 4 (RC4-40/128, AES-128):** lopdf
  authenticates the owner password but derives the file key from it as if it
  were the user password. The load "succeeds" and every string/stream is
  garbage. Workaround: recover the user password from `/O` (ISO 32000-2
  Algorithm 7: MD5 ×51 + RC4 ×20), verify it authenticates, then load with it.
- **Bug 2 — non-ASCII password, revision ≤ 4:** lopdf authenticates with the
  PDFDocEncoded password but derives the key from the password string's raw
  UTF-8 bytes — again silent garbage. lopdf's API only accepts the password as
  a `String`, so non-ASCII PDFDocEncoded bytes can't be passed through.
  Workaround: refuse with `UNSUPPORTED_ENCRYPTION`. AES-256 (R5/R6) is
  unaffected (SASLprep output is UTF-8), so accented passwords work there.
- For R5/R6 we hand lopdf the SASLprep'd password so its key derivation sees the
  same bytes its authentication did.
- The wasm32 build needs no extra `getrandom` cfg flags with
  `features = ["wasm_js"]`. Release output ≈ 612 KB (≈ 280 KB gzipped).
- Pins: Rust `1.95.0` (lopdf needs ≥ 1.88), wasm-pack `0.15.0`.

These two bugs are worth reporting upstream to lopdf (optional follow-up).

## Architecture

```
tools/pdf-unlock/            Rust crate (cdylib + rlib)
  Cargo.toml, Cargo.lock
  rust-toolchain.toml        pins toolchain + wasm32-unknown-unknown target
  src/lib.rs                 module wiring + re-exports
  src/error.rs               UnlockError + stable string codes
  src/pdf.rs                 inspect/unlock core (testable natively)
  src/legacy.rs              R2–R4 owner→user password recovery
  src/wasm.rs                wasm-bindgen exports (wasm32 only)
  tests/fixtures/*.pdf       qpdf-encrypted fixtures
  tests/fixtures/generate.sh regenerates fixtures with qpdf
  tests/unlock.rs            integration tests over fixtures
  scripts/build.sh           wasm-pack build + source hash stamp
  scripts/source-hash.mjs    computes / writes / checks .source-hash

app/src/wasm/pdf-unlock/     committed wasm-pack output (--target web)
  pdf_unlock.js, pdf_unlock_bg.wasm, *.d.ts, .source-hash

app/src/tools/pdfUnlock/
  protocol.ts                worker message types + error codes
  worker.ts                  Web Worker: loads WASM, runs inspect/unlock
  client.ts                  promise API over the worker
  filename.ts                <name>-unlocked.pdf naming
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
  { type: 'module' })`, with Vite `worker.format: 'es'`. Requests are
  `{ id, op: 'inspect' | 'unlock', file, password? }` — the `File` itself is
  posted (structured clone of a blob handle, no copy) and read inside the
  worker. The unlocked bytes come back as a transferred `ArrayBuffer`. The
  worker initializes the WASM once (URL via `?url` import).
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
- Output via `Blob` + `URL.createObjectURL`; the URL is kept while the download
  button is shown (so it can be clicked again) and revoked on reset, on picking
  a new file, and on unmount.
- Password lives only in component state; cleared on reset, success, and
  unmount. The worker is terminated on unmount.
- Page shows a short note: processing is local, verify in the network tab,
  link to the source on GitHub.

## Error handling

| Code | Meaning | UI |
|---|---|---|
| `NOT_ENCRYPTED` | PDF has no `/Encrypt` | "This PDF isn't password-protected." |
| `WRONG_PASSWORD` | Neither user nor owner password matched | Inline error on the password field, retry allowed |
| `UNSUPPORTED_ENCRYPTION` | Non-standard/public-key handler, unknown filter, or a non-ASCII password on an R ≤ 4 file | Explain it's not supported |
| `MALFORMED_PDF` | Parse failure, not a PDF, or unexpected error | Generic "couldn't read this file" |

## Testing

- **Rust (`cargo test`):** fixtures generated by qpdf from a small plain PDF:
  RC4-40, RC4-128, AES-128, AES-256, AES-256 with object streams, AES-256 and
  RC4-128 owner-only (empty user password), AES-256 and RC4-128 with the
  non-ASCII user password `contraseña`. For each: `inspect` result; `unlock`
  with the user and the owner password yields a document with no `/Encrypt`
  whose page text matches the original; wrong password → `WRONG_PASSWORD`;
  RC4 + non-ASCII → `UNSUPPORTED_ENCRYPTION`. Plain PDF → `NOT_ENCRYPTED`;
  garbage bytes → `MALFORMED_PDF`; `/Adobe.PubSec` handler →
  `UNSUPPORTED_ENCRYPTION`.
- **Vitest (node env):** the committed WASM artifact itself is loaded and run
  against fixtures, so a broken or stale build fails the JS test suite too.
- **Vitest:** `PdfUnlock` page with `client` mocked — state transitions,
  wrong-password retry, owner-only auto-unlock, download link, reset clears
  state. `Tools` index renders its cards. Navbar test updated for the new item.
- **Manual:** run the dev server, unlock each fixture in the browser, confirm
  the network panel shows only static asset loads.
