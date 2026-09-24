# PDF Unlock Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/tools` section to the resume site whose first tool removes the password from a PDF entirely in the browser, using a Rust crate compiled to WebAssembly.

**Architecture:** A small Rust crate (`tools/pdf-unlock`) wraps `lopdf` with a native-testable `inspect`/`unlock` core plus workarounds for two lopdf key-derivation bugs, and exposes it via wasm-bindgen. The built WASM is committed to `app/src/wasm/pdf-unlock/` (so Cloudflare/Docker/npm builds need no Rust), guarded by a source-hash freshness check in CI. The React page talks to the WASM through a Web Worker behind a promise-based client.

**Tech Stack:** Rust 1.95.0, lopdf 0.45, md-5 0.11, wasm-bindgen 0.2, wasm-pack 0.15.0, qpdf (fixtures only); React 18, TypeScript, Vite 6, Tailwind 3, Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-24-pdf-unlock-tool-design.md` — read it first, especially "lopdf behavior and workarounds".

## Global Constraints

- Rust toolchain pinned to `1.95.0` via `tools/pdf-unlock/rust-toolchain.toml`; crate edition 2024; `rust-version = "1.88"`.
- `lopdf = { version = "0.45", default-features = false, features = ["wasm_js"] }` — no rayon/chrono.
- wasm-pack pinned to `0.15.0`; build with `--release --target web --out-name pdf_unlock`.
- Stable error codes, identical in Rust and TS: `NOT_ENCRYPTED`, `WRONG_PASSWORD`, `UNSUPPORTED_ENCRYPTION`, `MALFORMED_PDF`.
- Never emit a corrupted PDF: anything we can't decrypt correctly is refused with `UNSUPPORTED_ENCRYPTION`.
- Privacy: file bytes and password never go to `fetch`/XHR/beacon; no `localStorage`/`sessionStorage`/IndexedDB/cookies in the tool; password lives only in component state; the Blob URL is revoked on reset, new file, and unmount; the worker is terminated on unmount.
- Passwords are passed exactly as typed — never trimmed or normalized in the UI.
- Committed WASM output lives in `app/src/wasm/pdf-unlock/` with a `.source-hash` stamp; the Dockerfile and `wrangler.toml` stay unchanged.
- Nav item: `{ to: '/tools', proLabel: 'Tools', rpgLabel: 'Forge' }` with a pixel `AnvilIcon`. Routes `/tools` and `/tools/pdf-unlock` are `React.lazy`.
- Download filename: `<name without .pdf>-unlocked.pdf`.
- `rustup`'s cargo must be used, not Homebrew's: on this Mac `/opt/homebrew/bin/cargo` shadows `~/.cargo/bin/cargo` and ignores `rust-toolchain.toml`. Run Rust commands as `PATH="$HOME/.cargo/bin:$PATH" cargo …` (the build script does this itself).
- The app's `tsc` already has ~69 pre-existing errors (labels.ts literal types, WebGPU types). Don't fix them here; only ensure the new files add none (Task 9 checks).

## Review Focus

1. **Non-ASCII passwords** (e.g. Spanish `contraseña`) — must unlock AES-256 files, and must be *refused* (not silently corrupted) on legacy RC4/AES-128 files. Pinned by Task 2 (`aes-256-utf8`, `rc4-128-utf8`) and Task 3 tests.
2. **Passwords with leading/trailing spaces** — must be used verbatim, never trimmed. Pinned by the Task 2 Rust test and the Task 7 UI test.
3. **Picking a new file while the previous one is still processing** — only the latest file's result may appear. Pinned by the Task 7 "stale result" test.
4. **Odd filenames** (`REPORT.PDF`, no extension, just `.pdf`) — sensible download names. Pinned by Task 7 `filename` tests.
5. **Large PDFs (tens of MB)** — UI stays responsive (worker) and the run completes or fails with an error, never hangs. Pinned by the Task 9 manual check with a generated ~50 MB file.

---

### Task 1: Crate scaffold, fixtures, error type, and `inspect`

**Files:**
- Create: `tools/pdf-unlock/Cargo.toml`
- Create: `tools/pdf-unlock/rust-toolchain.toml`
- Create: `tools/pdf-unlock/.gitignore`
- Create: `tools/pdf-unlock/src/lib.rs`
- Create: `tools/pdf-unlock/src/error.rs`
- Create: `tools/pdf-unlock/src/pdf.rs`
- Create: `tools/pdf-unlock/tests/fixtures/generate.sh`
- Create (generated): `tools/pdf-unlock/tests/fixtures/*.pdf` (10 files)
- Test: `tools/pdf-unlock/tests/unlock.rs`

**Interfaces:**
- Produces: `pdf_unlock::UnlockError` (`NotEncrypted | WrongPassword | UnsupportedEncryption | MalformedPdf`, `fn code(self) -> &'static str`), `pdf_unlock::Inspection { pub encrypted: bool, pub needs_password: bool }`, `pdf_unlock::inspect(bytes: &[u8]) -> Result<Inspection, UnlockError>`. Private helpers in `pdf.rs` used by Task 2: `fn load(bytes: &[u8]) -> Result<Document, UnlockError>`, `fn standard_revision(doc: &Document) -> Result<i64, UnlockError>`, `fn unsupported<E>(_: E) -> UnlockError`.
- Fixtures (all contain one page with the text `Hello from the unlock fixture`; owner password is `owner` everywhere):
  `plain` (unencrypted), `rc4-40`, `rc4-128`, `aes-128`, `aes-256`, `aes-256-objstm` (user password `user`), `aes-256-owner-only`, `rc4-128-owner-only` (empty user password), `aes-256-utf8`, `rc4-128-utf8` (user password `contraseña`).

- [ ] **Step 1: Install fixture tooling (once per machine)**

Run: `brew install qpdf` (skip if `qpdf --version` works). Expected: `qpdf version 12.x`.

- [ ] **Step 2: Create the crate manifest and toolchain pin**

`tools/pdf-unlock/Cargo.toml`:

```toml
[package]
name = "pdf-unlock"
version = "0.1.0"
edition = "2024"
rust-version = "1.88"
description = "Remove the password from a PDF in the browser, via WebAssembly"
license = "MIT"
repository = "https://github.com/jgarcesres/resume"
publish = false

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
lopdf = { version = "0.45", default-features = false, features = ["wasm_js"] }
md-5 = "0.11"
wasm-bindgen = "0.2"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
```

`tools/pdf-unlock/rust-toolchain.toml`:

```toml
[toolchain]
channel = "1.95.0"
targets = ["wasm32-unknown-unknown"]
components = ["rustfmt", "clippy"]
profile = "minimal"
```

`tools/pdf-unlock/.gitignore`:

```
/target
```

- [ ] **Step 3: Write the fixture generator and generate fixtures**

`tools/pdf-unlock/tests/fixtures/generate.sh`:

```bash
#!/usr/bin/env bash
# Regenerates the encrypted PDF fixtures. Needs qpdf (brew install qpdf) and python3.
# qpdf is an independent PDF implementation, so these test lopdf against real-world output.
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'EOF'
objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
    b" /Resources << /Font << /F1 5 0 R >> >> >>",
    None,
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Title (Unlock Fixture) >>",
]
content = b"BT /F1 24 Tf 72 700 Td (Hello from the unlock fixture) Tj ET"
objs[3] = b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream"
out = bytearray(b"%PDF-1.7\n")
offsets = []
for i, body in enumerate(objs, 1):
    offsets.append(len(out))
    out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
xref = len(out)
out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
for off in offsets:
    out += b"%010d 00000 n \n" % off
out += b"trailer\n<< /Size %d /Root 1 0 R /Info 6 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
open("src.pdf", "wb").write(out)
EOF

# Let qpdf rewrite it so the plain fixture is a normal, well-formed PDF.
qpdf src.pdf plain.pdf
rm src.pdf

enc() {
  local out=$1
  shift
  qpdf --allow-weak-crypto "$@" -- plain.pdf "$out" </dev/null
}

enc rc4-40.pdf             --encrypt --user-password=user --owner-password=owner --bits=40
enc rc4-128.pdf            --encrypt --user-password=user --owner-password=owner --bits=128 --use-aes=n
enc aes-128.pdf            --encrypt --user-password=user --owner-password=owner --bits=128 --use-aes=y
enc aes-256.pdf            --encrypt --user-password=user --owner-password=owner --bits=256
enc aes-256-objstm.pdf     --object-streams=generate --encrypt --user-password=user --owner-password=owner --bits=256
enc aes-256-owner-only.pdf --encrypt --user-password= --owner-password=owner --bits=256 --print=none --extract=n
enc rc4-128-owner-only.pdf --encrypt --user-password= --owner-password=owner --bits=128 --use-aes=n
enc aes-256-utf8.pdf       --encrypt --user-password=contraseña --owner-password=owner --bits=256
enc rc4-128-utf8.pdf       --encrypt --user-password=contraseña --owner-password=owner --bits=128 --use-aes=n

echo "fixtures regenerated"
```

Run: `chmod +x tools/pdf-unlock/tests/fixtures/generate.sh && tools/pdf-unlock/tests/fixtures/generate.sh && /bin/ls tools/pdf-unlock/tests/fixtures/*.pdf | wc -l`
Expected: `fixtures regenerated` then `10`. (Use `/bin/ls`, not the shell's `ls` alias.)

- [ ] **Step 4: Write the failing tests**

`tools/pdf-unlock/tests/unlock.rs`:

```rust
use lopdf::{Document, Object, dictionary};
use pdf_unlock::{Inspection, UnlockError, inspect};

fn fixture(name: &str) -> Vec<u8> {
    let path = format!("{}/tests/fixtures/{name}.pdf", env!("CARGO_MANIFEST_DIR"));
    std::fs::read(&path).unwrap_or_else(|e| panic!("reading {path}: {e}"))
}

/// A PDF whose /Encrypt names the certificate-based handler, which we don't support.
fn pubsec_pdf() -> Vec<u8> {
    let mut doc = Document::load_mem(&fixture("plain")).unwrap();
    let encrypt = doc.add_object(dictionary! {
        "Filter" => "Adobe.PubSec",
        "V" => 1,
        "R" => 2,
        "P" => -4,
        "O" => Object::string_literal(vec![0u8; 32]),
        "U" => Object::string_literal(vec![0u8; 32]),
    });
    doc.trailer.set("Encrypt", encrypt);
    let mut out = Vec::new();
    doc.save_to(&mut out).unwrap();
    out
}

const LOCKED: Inspection = Inspection { encrypted: true, needs_password: true };
const OWNER_ONLY: Inspection = Inspection { encrypted: true, needs_password: false };

#[test]
fn error_codes_match_the_web_ui_contract() {
    assert_eq!(UnlockError::NotEncrypted.code(), "NOT_ENCRYPTED");
    assert_eq!(UnlockError::WrongPassword.code(), "WRONG_PASSWORD");
    assert_eq!(UnlockError::UnsupportedEncryption.code(), "UNSUPPORTED_ENCRYPTION");
    assert_eq!(UnlockError::MalformedPdf.code(), "MALFORMED_PDF");
    assert_eq!(UnlockError::WrongPassword.to_string(), "WRONG_PASSWORD");
}

#[test]
fn inspect_reports_plain_pdf_as_unencrypted() {
    assert_eq!(
        inspect(&fixture("plain")),
        Ok(Inspection { encrypted: false, needs_password: false })
    );
}

#[test]
fn inspect_reports_password_protected_pdfs() {
    for name in ["rc4-40", "rc4-128", "aes-128", "aes-256", "aes-256-objstm", "aes-256-utf8", "rc4-128-utf8"] {
        assert_eq!(inspect(&fixture(name)), Ok(LOCKED), "{name}");
    }
}

#[test]
fn inspect_reports_owner_only_pdfs_as_not_needing_a_password() {
    for name in ["aes-256-owner-only", "rc4-128-owner-only"] {
        assert_eq!(inspect(&fixture(name)), Ok(OWNER_ONLY), "{name}");
    }
}

#[test]
fn inspect_rejects_non_pdf_bytes() {
    assert_eq!(inspect(b"definitely not a pdf"), Err(UnlockError::MalformedPdf));
    assert_eq!(inspect(b""), Err(UnlockError::MalformedPdf));
}

#[test]
fn inspect_rejects_non_standard_security_handlers() {
    assert_eq!(inspect(&pubsec_pdf()), Err(UnlockError::UnsupportedEncryption));
}
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test`
Expected: FAIL — compile error, `pdf_unlock` has no `inspect`/`Inspection`/`UnlockError` (src/lib.rs doesn't exist yet).

- [ ] **Step 6: Implement error type, `inspect`, and lib wiring**

`tools/pdf-unlock/src/error.rs`:

```rust
use std::fmt;

/// Why a PDF couldn't be inspected or unlocked.
///
/// `code()` is the stable string the web UI switches on — keep it in sync with
/// `UNLOCK_CODES` in `app/src/tools/pdfUnlock/protocol.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnlockError {
    NotEncrypted,
    WrongPassword,
    UnsupportedEncryption,
    MalformedPdf,
}

impl UnlockError {
    pub fn code(self) -> &'static str {
        match self {
            Self::NotEncrypted => "NOT_ENCRYPTED",
            Self::WrongPassword => "WRONG_PASSWORD",
            Self::UnsupportedEncryption => "UNSUPPORTED_ENCRYPTION",
            Self::MalformedPdf => "MALFORMED_PDF",
        }
    }
}

impl fmt::Display for UnlockError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

impl std::error::Error for UnlockError {}
```

`tools/pdf-unlock/src/pdf.rs`:

```rust
use lopdf::encryption::PasswordAlgorithm;
use lopdf::{Document, Object};

use crate::UnlockError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Inspection {
    pub encrypted: bool,
    /// False when the PDF opens with an empty user password and only an owner
    /// password restricts printing/copying — those unlock without prompting.
    pub needs_password: bool,
}

pub fn inspect(bytes: &[u8]) -> Result<Inspection, UnlockError> {
    let doc = load(bytes)?;
    if doc.is_encrypted() {
        standard_revision(&doc)?;
        return Ok(Inspection { encrypted: true, needs_password: true });
    }
    // lopdf transparently decrypts PDFs whose user password is empty.
    Ok(Inspection { encrypted: doc.was_encrypted(), needs_password: false })
}

fn load(bytes: &[u8]) -> Result<Document, UnlockError> {
    Document::load_mem(bytes).map_err(|_| UnlockError::MalformedPdf)
}

/// Returns the security handler revision (/R) if this is the Standard password
/// handler in a form lopdf understands.
fn standard_revision(doc: &Document) -> Result<i64, UnlockError> {
    let dict = doc.get_encrypted().map_err(unsupported)?;
    let filter = dict.get(b"Filter").and_then(Object::as_name).map_err(unsupported)?;
    if filter != b"Standard" {
        return Err(UnlockError::UnsupportedEncryption);
    }
    PasswordAlgorithm::try_from(doc).map_err(unsupported)?;
    dict.get(b"R").and_then(Object::as_i64).map_err(unsupported)
}

fn unsupported<E>(_: E) -> UnlockError {
    UnlockError::UnsupportedEncryption
}
```

`tools/pdf-unlock/src/lib.rs`:

```rust
//! Remove the password from a PDF when the caller knows it.
//!
//! The core is plain Rust, tested natively with `cargo test`; `wasm.rs`
//! exposes it to the browser through wasm-bindgen.

mod error;
mod pdf;

pub use error::UnlockError;
pub use pdf::{Inspection, inspect};
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test && PATH="$HOME/.cargo/bin:$PATH" cargo fmt && PATH="$HOME/.cargo/bin:$PATH" cargo clippy --all-targets -- -D warnings`
Expected: 6 tests PASS; fmt and clippy clean. (If clippy flags dead code for `unsupported`/`load`, it won't — both are used by `inspect`.)

- [ ] **Step 8: Commit**

```bash
git add tools/pdf-unlock
git commit -m "feat(pdf-unlock): crate scaffold, qpdf fixtures, and inspect()"
```

---

### Task 2: `unlock` with the user password, plus refusal paths

**Files:**
- Modify: `tools/pdf-unlock/src/pdf.rs`
- Modify: `tools/pdf-unlock/src/lib.rs`
- Test: `tools/pdf-unlock/tests/unlock.rs`

**Interfaces:**
- Consumes: `load`, `standard_revision`, `unsupported` from Task 1.
- Produces: `pdf_unlock::unlock(bytes: &[u8], password: &str) -> Result<Vec<u8>, UnlockError>`. Private `fn key_password(doc: &Document, revision: i64, password: &str) -> Result<String, UnlockError>` — Task 3 replaces its revision ≤ 4 owner branch.

- [ ] **Step 1: Write the failing tests**

Change the `use pdf_unlock::…` line in `tests/unlock.rs` to:

```rust
use pdf_unlock::{Inspection, UnlockError, inspect, unlock};
```

Append to `tests/unlock.rs`:

```rust
const TEXT: &str = "Hello from the unlock fixture";

/// Parses unlock output and returns page 1's text, asserting no encryption survived.
fn unlocked_text(pdf: &[u8]) -> String {
    let doc = Document::load_mem(pdf).expect("unlocked output should parse");
    assert!(!doc.is_encrypted() && !doc.was_encrypted(), "output must not be encrypted");
    assert!(doc.trailer.get(b"Encrypt").is_err(), "output trailer must not reference /Encrypt");
    doc.extract_text(&[1]).expect("page 1 text").trim().to_string()
}

#[test]
fn unlock_with_user_password_decrypts_every_supported_cipher() {
    for name in ["rc4-40", "rc4-128", "aes-128", "aes-256", "aes-256-objstm"] {
        let out = unlock(&fixture(name), "user").unwrap_or_else(|e| panic!("{name}: {e}"));
        assert_eq!(unlocked_text(&out), TEXT, "{name}");
    }
}

#[test]
fn unlock_accepts_non_ascii_passwords_on_aes_256() {
    let out = unlock(&fixture("aes-256-utf8"), "contraseña").unwrap();
    assert_eq!(unlocked_text(&out), TEXT);
}

#[test]
fn unlock_refuses_non_ascii_passwords_on_legacy_ciphers_instead_of_corrupting() {
    // lopdf would "succeed" here and return garbage; see the spec's lopdf section.
    assert_eq!(unlock(&fixture("rc4-128-utf8"), "contraseña"), Err(UnlockError::UnsupportedEncryption));
}

#[test]
fn unlock_owner_only_pdfs_ignores_the_password() {
    for name in ["aes-256-owner-only", "rc4-128-owner-only"] {
        for pw in ["", "anything"] {
            let out = unlock(&fixture(name), pw).unwrap_or_else(|e| panic!("{name}/{pw:?}: {e}"));
            assert_eq!(unlocked_text(&out), TEXT, "{name}/{pw:?}");
        }
    }
}

#[test]
fn unlock_rejects_wrong_passwords() {
    for name in ["rc4-40", "rc4-128", "aes-128", "aes-256", "aes-256-objstm", "aes-256-utf8", "rc4-128-utf8"] {
        assert_eq!(unlock(&fixture(name), "nope"), Err(UnlockError::WrongPassword), "{name}");
        assert_eq!(unlock(&fixture(name), ""), Err(UnlockError::WrongPassword), "{name} (empty)");
    }
}

#[test]
fn unlock_does_not_trim_passwords() {
    assert_eq!(unlock(&fixture("aes-256"), " user"), Err(UnlockError::WrongPassword));
    assert_eq!(unlock(&fixture("rc4-128"), "user "), Err(UnlockError::WrongPassword));
}

#[test]
fn unlock_reports_plain_pdfs_as_not_encrypted() {
    assert_eq!(unlock(&fixture("plain"), "user"), Err(UnlockError::NotEncrypted));
}

#[test]
fn unlock_rejects_non_pdf_bytes() {
    assert_eq!(unlock(b"definitely not a pdf", "user"), Err(UnlockError::MalformedPdf));
}

#[test]
fn unlock_rejects_non_standard_security_handlers() {
    assert_eq!(unlock(&pubsec_pdf(), "user"), Err(UnlockError::UnsupportedEncryption));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test`
Expected: FAIL — compile error, no `unlock` in `pdf_unlock`.

- [ ] **Step 3: Implement `unlock`**

In `tools/pdf-unlock/src/pdf.rs`, change the lopdf import to:

```rust
use lopdf::{Document, LoadOptions, Object};
```

and add below `inspect`:

```rust
pub fn unlock(bytes: &[u8], password: &str) -> Result<Vec<u8>, UnlockError> {
    let probe = load(bytes)?;
    if !probe.is_encrypted() {
        // Owner-only PDFs were already decrypted with the empty user password.
        return if probe.was_encrypted() { save(probe) } else { Err(UnlockError::NotEncrypted) };
    }
    let revision = standard_revision(&probe)?;
    let key_password = key_password(&probe, revision, password)?;

    let doc = Document::load_mem_with_options(bytes, LoadOptions::with_password(&key_password))
        .map_err(|e| match e {
            // We authenticated above, so a rejection here means lopdf would
            // derive a different key than we did — refuse rather than guess.
            lopdf::Error::InvalidPassword => UnlockError::UnsupportedEncryption,
            _ => UnlockError::MalformedPdf,
        })?;
    if doc.is_encrypted() {
        return Err(UnlockError::UnsupportedEncryption);
    }
    save(doc)
}

/// Works out the password string to hand lopdf's reader so it derives the right
/// file key. lopdf 0.45 authenticates with the *encoded* password but derives
/// the key from the raw UTF-8 bytes of the string it's given, and for
/// revision <= 4 it derives the key from an owner password as if it were the
/// user password. Both fail silently: the PDF "opens" and every string and
/// stream is garbage.
fn key_password(doc: &Document, revision: i64, password: &str) -> Result<String, UnlockError> {
    let algorithm = PasswordAlgorithm::try_from(doc).map_err(unsupported)?;
    let encoded = algorithm.sanitize_password(password).map_err(unsupported)?;

    let key_bytes = if doc.authenticate_raw_user_password(&encoded).is_ok() {
        encoded
    } else if doc.authenticate_raw_owner_password(&encoded).is_ok() {
        if revision >= 5 {
            // AES-256 derives the file key from either password directly.
            encoded
        } else {
            // Legacy owner passwords need the user password recovered first.
            return Err(UnlockError::UnsupportedEncryption);
        }
    } else {
        return Err(UnlockError::WrongPassword);
    };

    if revision <= 4 && !key_bytes.is_ascii() {
        // Non-ASCII PDFDocEncoding bytes can't be expressed as a string whose
        // UTF-8 bytes equal them, which is what lopdf would hash.
        return Err(UnlockError::UnsupportedEncryption);
    }
    String::from_utf8(key_bytes).map_err(unsupported)
}

fn save(mut doc: Document) -> Result<Vec<u8>, UnlockError> {
    let mut out = Vec::new();
    doc.save_to(&mut out).map_err(|_| UnlockError::MalformedPdf)?;
    Ok(out)
}
```

In `tools/pdf-unlock/src/lib.rs`, change the re-export to:

```rust
pub use pdf::{Inspection, inspect, unlock};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test && PATH="$HOME/.cargo/bin:$PATH" cargo fmt && PATH="$HOME/.cargo/bin:$PATH" cargo clippy --all-targets -- -D warnings`
Expected: 15 tests PASS; fmt and clippy clean.

- [ ] **Step 5: Commit**

```bash
git add tools/pdf-unlock
git commit -m "feat(pdf-unlock): unlock() with user passwords; refuse cases lopdf would corrupt"
```

---

### Task 3: Legacy owner-password recovery (R2–R4)

**Files:**
- Create: `tools/pdf-unlock/src/legacy.rs`
- Modify: `tools/pdf-unlock/src/pdf.rs` (the owner branch in `key_password`, plus a new helper)
- Modify: `tools/pdf-unlock/src/lib.rs`
- Test: `tools/pdf-unlock/tests/unlock.rs`, unit tests inside `legacy.rs`

**Interfaces:**
- Consumes: `key_password`, `unsupported` from Task 2.
- Produces: `pub(crate) fn legacy::recover_user_password(owner_password: &[u8], o_entry: &[u8], revision: i64, key_length_bytes: usize) -> Option<Vec<u8>>`.

- [ ] **Step 1: Write the failing tests**

Append to `tools/pdf-unlock/tests/unlock.rs`:

```rust
#[test]
fn unlock_with_owner_password_decrypts_every_supported_cipher() {
    for name in ["rc4-40", "rc4-128", "aes-128", "aes-256", "aes-256-objstm", "aes-256-utf8"] {
        let out = unlock(&fixture(name), "owner").unwrap_or_else(|e| panic!("{name}: {e}"));
        assert_eq!(unlocked_text(&out), TEXT, "{name}");
    }
}

#[test]
fn unlock_refuses_legacy_owner_password_when_the_user_password_is_non_ascii() {
    // The recovered user password ("contraseña") can't be handed to lopdf intact.
    assert_eq!(unlock(&fixture("rc4-128-utf8"), "owner"), Err(UnlockError::UnsupportedEncryption));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test unlock_with_owner_password`
Expected: FAIL — `rc4-40: UNSUPPORTED_ENCRYPTION` (the Task 2 placeholder branch).

- [ ] **Step 3: Implement recovery**

`tools/pdf-unlock/src/legacy.rs`:

```rust
//! Owner-password support for the legacy (revision 2–4) security handler.
//!
//! For these revisions the file key is derived from the *user* password, so an
//! owner password must first be turned back into the user password
//! (ISO 32000-2 §7.6.4.4, Algorithm 7). lopdf 0.45 skips this step.

use md5::{Digest, Md5};

/// Padding string from ISO 32000-2 §7.6.4.3.2 (Algorithm 2, step a).
const PAD: [u8; 32] = [
    0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
    0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
];

/// Recovers the user password from an already-authenticated owner password.
///
/// `owner_password` is the PDFDocEncoded owner password, `o_entry` the /O
/// string, and `key_length_bytes` the key length (/Length ÷ 8). Returns `None`
/// when /O is too short. The caller must verify the result authenticates.
pub(crate) fn recover_user_password(
    owner_password: &[u8],
    o_entry: &[u8],
    revision: i64,
    key_length_bytes: usize,
) -> Option<Vec<u8>> {
    if o_entry.len() < 32 {
        return None;
    }

    let mut padded = owner_password[..owner_password.len().min(32)].to_vec();
    padded.extend_from_slice(&PAD[..32 - padded.len()]);
    let mut hash = Md5::digest(&padded).to_vec();
    if revision >= 3 {
        for _ in 0..50 {
            hash = Md5::digest(&hash).to_vec();
        }
    }
    let key = &hash[..if revision == 2 { 5 } else { key_length_bytes.clamp(5, 16) }];

    let mut user = o_entry[..32].to_vec();
    if revision == 2 {
        user = rc4(key, &user);
    } else {
        for i in (0..20u8).rev() {
            let round_key: Vec<u8> = key.iter().map(|b| b ^ i).collect();
            user = rc4(&round_key, &user);
        }
    }

    // The result is the user password followed by the start of PAD.
    let len = (0..=32).find(|&n| user[n..] == PAD[..32 - n])?;
    user.truncate(len);
    Some(user)
}

fn rc4(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut s: [u8; 256] = core::array::from_fn(|i| i as u8);
    let mut j = 0u8;
    for i in 0..256 {
        j = j.wrapping_add(s[i]).wrapping_add(key[i % key.len()]);
        s.swap(i, j as usize);
    }
    let (mut i, mut j) = (0u8, 0u8);
    data.iter()
        .map(|byte| {
            i = i.wrapping_add(1);
            j = j.wrapping_add(s[i as usize]);
            s.swap(i as usize, j as usize);
            byte ^ s[s[i as usize].wrapping_add(s[j as usize]) as usize]
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rc4_matches_the_published_test_vector() {
        assert_eq!(rc4(b"Key", b"Plaintext"), [0xBB, 0xF3, 0x16, 0xE8, 0xD9, 0x40, 0xAF, 0x0A, 0xD3]);
    }

    #[test]
    fn short_o_entry_is_rejected() {
        assert_eq!(recover_user_password(b"owner", &[0u8; 16], 3, 16), None);
    }
}
```

In `tools/pdf-unlock/src/pdf.rs`, add `use crate::legacy;` under `use crate::UnlockError;`, then replace the owner branch inside `key_password`:

```rust
    } else if doc.authenticate_raw_owner_password(&encoded).is_ok() {
        if revision >= 5 {
            // AES-256 derives the file key from either password directly.
            encoded
        } else {
            recovered_user_password(doc, revision, &encoded)?
        }
    } else {
```

and add this helper below `key_password`:

```rust
/// Revision <= 4: turn an authenticated owner password back into the user
/// password (which the file key is derived from) and double-check it.
fn recovered_user_password(doc: &Document, revision: i64, owner: &[u8]) -> Result<Vec<u8>, UnlockError> {
    let dict = doc.get_encrypted().map_err(unsupported)?;
    let o_entry = dict.get(b"O").and_then(Object::as_str).map_err(unsupported)?;
    // /Length is optional; V4 (AES-128) files are always 128-bit.
    let default_bits = if revision == 4 { 128 } else { 40 };
    let length_bits = dict.get(b"Length").and_then(Object::as_i64).unwrap_or(default_bits);
    let key_length = usize::try_from(length_bits / 8).map_err(unsupported)?;

    legacy::recover_user_password(owner, o_entry, revision, key_length)
        .filter(|user| doc.authenticate_raw_user_password(user).is_ok())
        .ok_or(UnlockError::UnsupportedEncryption)
}
```

In `tools/pdf-unlock/src/lib.rs`, add `mod legacy;` between `mod error;` and `mod pdf;`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo test && PATH="$HOME/.cargo/bin:$PATH" cargo fmt && PATH="$HOME/.cargo/bin:$PATH" cargo clippy --all-targets -- -D warnings`
Expected: 17 integration tests + 2 unit tests PASS; fmt and clippy clean.

- [ ] **Step 5: Commit**

```bash
git add tools/pdf-unlock
git commit -m "feat(pdf-unlock): recover the user password for legacy owner-password unlocks"
```

---

### Task 4: WASM bindings, build script, committed artifact, and JS-side WASM test

**Files:**
- Create: `tools/pdf-unlock/src/wasm.rs`
- Modify: `tools/pdf-unlock/src/lib.rs`
- Create: `tools/pdf-unlock/scripts/build.sh`
- Create: `tools/pdf-unlock/scripts/source-hash.mjs`
- Create (generated, committed): `app/src/wasm/pdf-unlock/{pdf_unlock.js,pdf_unlock.d.ts,pdf_unlock_bg.wasm,pdf_unlock_bg.wasm.d.ts,.source-hash}`
- Modify: `app/package.json` (script)
- Modify: `app/eslint.config.js` (ignore generated code)
- Test: `app/src/test/wasm/pdfUnlockWasm.test.ts`

**Interfaces:**
- Consumes: `pdf_unlock::{inspect, unlock, UnlockError}`.
- Produces (JS, from `app/src/wasm/pdf-unlock/pdf_unlock.js`): `default init({ module_or_path })`, `initSync({ module })`, `inspect(bytes: Uint8Array): InspectResult` (fields `encrypted: boolean`, `needsPassword: boolean`, method `free()`), `unlock(bytes: Uint8Array, password: string): Uint8Array`. Both throw a JS `Error` whose `message` is an error code.
- Produces: `npm run build:wasm` (from `app/`); `node tools/pdf-unlock/scripts/source-hash.mjs [--write|--check]`.

- [ ] **Step 1: Install wasm-pack (once per machine)**

Run: `brew install wasm-pack` (or `cargo install wasm-pack --version 0.15.0 --locked`), then `wasm-pack --version`.
Expected: `wasm-pack 0.15.0`.

- [ ] **Step 2: Write the failing JS-side test**

`app/src/test/wasm/pdfUnlockWasm.test.ts`:

```ts
// @vitest-environment node
// Runs the *committed* WASM build, so a broken or stale artifact fails `npm test`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync, inspect, unlock } from '../../wasm/pdf-unlock/pdf_unlock.js';

const wasmPath = fileURLToPath(new URL('../../wasm/pdf-unlock/pdf_unlock_bg.wasm', import.meta.url));
const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(fileURLToPath(new URL(`../../../../tools/pdf-unlock/tests/fixtures/${name}.pdf`, import.meta.url))),
  );
const startsWithPdfHeader = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';

describe('pdf-unlock wasm', () => {
  beforeAll(() => {
    initSync({ module: readFileSync(wasmPath) });
  });

  it('inspects an encrypted PDF', () => {
    const result = inspect(fixture('aes-256'));
    expect(result.encrypted).toBe(true);
    expect(result.needsPassword).toBe(true);
    result.free();
  });

  it('unlocks with the user password', () => {
    expect(startsWithPdfHeader(unlock(fixture('aes-256'), 'user'))).toBe(true);
  });

  it('unlocks legacy RC4 with the owner password', () => {
    expect(startsWithPdfHeader(unlock(fixture('rc4-128'), 'owner'))).toBe(true);
  });

  it('throws error codes as messages', () => {
    expect(() => unlock(fixture('aes-256'), 'nope')).toThrow('WRONG_PASSWORD');
    expect(() => inspect(new TextEncoder().encode('not a pdf'))).toThrow('MALFORMED_PDF');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app && npx vitest run src/test/wasm`
Expected: FAIL — cannot resolve `../../wasm/pdf-unlock/pdf_unlock.js`.

- [ ] **Step 4: Add the wasm-bindgen exports**

`tools/pdf-unlock/src/wasm.rs`:

```rust
//! Browser bindings. Failures surface as a JS `Error` whose message is an
//! `UnlockError::code()` string.

use wasm_bindgen::prelude::*;

use crate::UnlockError;

#[wasm_bindgen]
pub struct InspectResult {
    pub encrypted: bool,
    #[wasm_bindgen(js_name = needsPassword)]
    pub needs_password: bool,
}

#[wasm_bindgen(js_name = inspect)]
pub fn inspect_js(bytes: &[u8]) -> Result<InspectResult, JsError> {
    let inspection = crate::inspect(bytes).map_err(to_js)?;
    Ok(InspectResult { encrypted: inspection.encrypted, needs_password: inspection.needs_password })
}

#[wasm_bindgen(js_name = unlock)]
pub fn unlock_js(bytes: &[u8], password: &str) -> Result<Vec<u8>, JsError> {
    crate::unlock(bytes, password).map_err(to_js)
}

fn to_js(err: UnlockError) -> JsError {
    JsError::new(err.code())
}
```

Add to `tools/pdf-unlock/src/lib.rs` after `mod pdf;`:

```rust
#[cfg(target_arch = "wasm32")]
mod wasm;
```

- [ ] **Step 5: Write the source-hash script**

`tools/pdf-unlock/scripts/source-hash.mjs`:

```js
// Fingerprints everything that determines the WASM build, so CI can tell when
// the committed artifact in app/src/wasm/pdf-unlock is stale. We don't compare
// .wasm bytes: they embed host paths that differ between macOS and CI.
//
//   node source-hash.mjs          print the hash
//   node source-hash.mjs --write  write app/src/wasm/pdf-unlock/.source-hash
//   node source-hash.mjs --check  exit 1 if the committed stamp is stale
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const crate = join(dirname(fileURLToPath(import.meta.url)), '..');
const stampPath = join(crate, '../../app/src/wasm/pdf-unlock/.source-hash');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const inputs = [
  ...walk(join(crate, 'src')),
  ...['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'scripts/build.sh'].map((f) => join(crate, f)),
]
  .map((path) => relative(crate, path).split('\\').join('/'))
  .sort();

const hash = createHash('sha256');
for (const file of inputs) {
  hash.update(`${file}\0`);
  hash.update(readFileSync(join(crate, file)));
  hash.update('\0');
}
const digest = hash.digest('hex');

const mode = process.argv[2];
if (mode === '--write') {
  writeFileSync(stampPath, `${digest}\n`);
  console.log(`wrote ${digest}`);
} else if (mode === '--check') {
  const committed = readFileSync(stampPath, 'utf8').trim();
  if (committed !== digest) {
    console.error(
      `app/src/wasm/pdf-unlock is stale (stamp ${committed}, sources ${digest}).\n` +
        'Run `npm run build:wasm` in app/ and commit the result.',
    );
    process.exit(1);
  }
  console.log('pdf-unlock WASM is up to date');
} else {
  console.log(digest);
}
```

- [ ] **Step 6: Write the build script**

`tools/pdf-unlock/scripts/build.sh`:

```bash
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
```

Run: `chmod +x tools/pdf-unlock/scripts/build.sh`

- [ ] **Step 7: Wire npm and eslint**

In `app/package.json` `"scripts"`, add after `"build"`:

```json
    "build:wasm": "bash ../tools/pdf-unlock/scripts/build.sh",
```

In `app/eslint.config.js`, change `{ ignores: ['dist'] },` to:

```js
  { ignores: ['dist', 'src/wasm'] },
```

- [ ] **Step 8: Build and run the test**

Run: `cd app && npm run build:wasm && /bin/ls -la src/wasm/pdf-unlock && npx vitest run src/test/wasm`
Expected: build ends with `wrote <hash>`; the directory has `pdf_unlock.js`, `pdf_unlock.d.ts`, `pdf_unlock_bg.wasm` (~600 KB), `pdf_unlock_bg.wasm.d.ts`, `.source-hash` and no `.gitignore`/`package.json`; 4 tests PASS.

- [ ] **Step 9: Verify the freshness check both ways**

Run: `node tools/pdf-unlock/scripts/source-hash.mjs --check`
Expected: `pdf-unlock WASM is up to date`.

Run: `echo "// probe" >> tools/pdf-unlock/src/error.rs && node tools/pdf-unlock/scripts/source-hash.mjs --check; echo "exit=$?"; git checkout tools/pdf-unlock/src/error.rs`
Expected: the "is stale" message and `exit=1`; then the file is restored.

- [ ] **Step 10: Run the whole suite and lint**

Run: `cd app && npm test && npm run lint && cd ../tools/pdf-unlock && PATH="$HOME/.cargo/bin:$PATH" cargo clippy --target wasm32-unknown-unknown -- -D warnings`
Expected: all tests PASS; lint has no errors; wasm32 clippy clean.

- [ ] **Step 11: Commit**

```bash
git add tools/pdf-unlock app/src/wasm app/src/test/wasm app/package.json app/eslint.config.js
git commit -m "feat(pdf-unlock): wasm-bindgen exports, build script, and committed WASM build"
```

---

### Task 5: CI job for the Rust crate and WASM freshness

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

**Interfaces:**
- Consumes: `tools/pdf-unlock/rust-toolchain.toml`, `tools/pdf-unlock/scripts/source-hash.mjs --check` (Task 4).
- Produces: a `wasm` job; `build` and `docker-build` now `needs: [lint, test, wasm]`.

- [ ] **Step 1: Add the job**

In `.github/workflows/ci-cd.yml`, insert this job after the `test` job (before `build:`):

```yaml
  wasm:
    name: WASM (Rust)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: tools/pdf-unlock
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Rust toolchain (from rust-toolchain.toml)
        run: rustup toolchain install && rustup show active-toolchain

      - name: Cache cargo
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: tools/pdf-unlock

      - name: Install wasm-pack
        uses: taiki-e/install-action@v2
        with:
          tool: wasm-pack@0.15.0

      - name: Format
        run: cargo fmt --check

      - name: Clippy (native + wasm32)
        run: |
          cargo clippy --all-targets -- -D warnings
          cargo clippy --target wasm32-unknown-unknown -- -D warnings

      - name: Test
        run: cargo test

      - name: Build WASM
        run: wasm-pack build --release --target web --out-dir "$RUNNER_TEMP/pdf-unlock-pkg" --out-name pdf_unlock

      - name: Committed WASM matches sources
        run: node scripts/source-hash.mjs --check
```

Change the `build` job's `needs: [lint, test]` to `needs: [lint, test, wasm]`, and the `docker-build` job's `needs: [lint, test]` to `needs: [lint, test, wasm]`.

- [ ] **Step 2: Validate the YAML and dry-run the job's commands locally**

Run: `ruby -ryaml -e 'y = YAML.load_file(".github/workflows/ci-cd.yml"); puts y["jobs"].keys.inspect; puts y["jobs"]["build"]["needs"].inspect'`
Expected: `["lint", "test", "wasm", "build", "docker-build"]` and `["lint", "test", "wasm"]`.

Run: `cd tools/pdf-unlock && export PATH="$HOME/.cargo/bin:$PATH" && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo clippy --target wasm32-unknown-unknown -- -D warnings && cargo test && wasm-pack build --release --target web --out-dir "$TMPDIR/pdf-unlock-pkg" --out-name pdf_unlock && node scripts/source-hash.mjs --check`
Expected: every step succeeds, ending with `pdf-unlock WASM is up to date`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: build and test the pdf-unlock crate; fail on a stale committed WASM"
```

---

### Task 6: Worker protocol, worker, and promise client

**Files:**
- Create: `app/src/tools/pdfUnlock/protocol.ts`
- Create: `app/src/tools/pdfUnlock/worker.ts`
- Create: `app/src/tools/pdfUnlock/client.ts`
- Modify: `app/vite.config.ts` (worker format)
- Test: `app/src/test/tools/pdfUnlockProtocol.test.ts`, `app/src/test/tools/pdfUnlockClient.test.ts`

**Interfaces:**
- Consumes: `init`, `inspect`, `unlock` from `app/src/wasm/pdf-unlock/pdf_unlock.js` (Task 4).
- Produces (`protocol.ts`): `UNLOCK_CODES`, `type UnlockCode`, `toUnlockCode(value: unknown): UnlockCode`, `interface Inspection { encrypted: boolean; needsPassword: boolean }`, `type WorkerRequest`, `type WorkerResponse`.
- Produces (`client.ts`): `class UnlockFailure extends Error { readonly code: UnlockCode }`, `interface PdfUnlocker { inspect(file: Blob): Promise<Inspection>; unlock(file: Blob, password: string): Promise<Uint8Array>; dispose(): void }`, `interface WorkerLike`, `type WorkerFactory = () => WorkerLike`, `createPdfUnlocker(factory?: WorkerFactory): PdfUnlocker`.

- [ ] **Step 1: Write the failing tests**

`app/src/test/tools/pdfUnlockProtocol.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toUnlockCode } from '../../tools/pdfUnlock/protocol';

describe('toUnlockCode', () => {
  it('passes known codes through from wasm errors', () => {
    expect(toUnlockCode(new Error('WRONG_PASSWORD'))).toBe('WRONG_PASSWORD');
    expect(toUnlockCode(new Error('UNSUPPORTED_ENCRYPTION'))).toBe('UNSUPPORTED_ENCRYPTION');
  });

  it('maps anything unrecognised to MALFORMED_PDF', () => {
    expect(toUnlockCode(new Error('RuntimeError: unreachable'))).toBe('MALFORMED_PDF');
    expect(toUnlockCode('boom')).toBe('MALFORMED_PDF');
    expect(toUnlockCode(undefined)).toBe('MALFORMED_PDF');
  });
});
```

`app/src/test/tools/pdfUnlockClient.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPdfUnlocker, UnlockFailure, type WorkerLike } from '../../tools/pdfUnlock/client';
import type { WorkerRequest, WorkerResponse } from '../../tools/pdfUnlock/protocol';

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  sent: WorkerRequest[] = [];
  terminated = false;
  postMessage(message: WorkerRequest) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(response: WorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }
  crash() {
    this.onerror?.({ preventDefault() {} } as unknown as ErrorEvent);
  }
}

const file = new Blob(['%PDF-1.7'], { type: 'application/pdf' });

function setup() {
  const workers: FakeWorker[] = [];
  const factory = vi.fn(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { unlocker: createPdfUnlocker(factory), factory, workers };
}

describe('createPdfUnlocker', () => {
  it('starts the worker lazily and resolves inspect results', async () => {
    const { unlocker, factory, workers } = setup();
    expect(factory).not.toHaveBeenCalled();

    const pending = unlocker.inspect(file);
    const [request] = workers[0].sent;
    expect(request).toMatchObject({ op: 'inspect', file });
    workers[0].reply({ id: request.id, ok: true, op: 'inspect', inspection: { encrypted: true, needsPassword: true } });

    await expect(pending).resolves.toEqual({ encrypted: true, needsPassword: true });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('sends the password verbatim and resolves the unlocked bytes', async () => {
    const { unlocker, workers } = setup();
    const pending = unlocker.unlock(file, '  spaced pw ');
    const [request] = workers[0].sent;
    expect(request).toMatchObject({ op: 'unlock', password: '  spaced pw ' });
    workers[0].reply({ id: request.id, ok: true, op: 'unlock', pdf: new Uint8Array([37, 80, 68, 70]).buffer });

    await expect(pending).resolves.toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('rejects with an UnlockFailure carrying the worker error code', async () => {
    const { unlocker, workers } = setup();
    const pending = unlocker.unlock(file, 'nope');
    workers[0].reply({ id: workers[0].sent[0].id, ok: false, code: 'WRONG_PASSWORD' });

    await expect(pending).rejects.toBeInstanceOf(UnlockFailure);
    await expect(pending).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
  });

  it('matches responses to requests by id', async () => {
    const { unlocker, workers } = setup();
    const first = unlocker.inspect(file);
    const second = unlocker.inspect(file);
    const [a, b] = workers[0].sent;
    workers[0].reply({ id: b.id, ok: true, op: 'inspect', inspection: { encrypted: false, needsPassword: false } });
    workers[0].reply({ id: a.id, ok: true, op: 'inspect', inspection: { encrypted: true, needsPassword: true } });

    await expect(first).resolves.toEqual({ encrypted: true, needsPassword: true });
    await expect(second).resolves.toEqual({ encrypted: false, needsPassword: false });
  });

  it('fails pending requests when the worker crashes, then starts a fresh worker', async () => {
    const { unlocker, workers } = setup();
    const pending = unlocker.inspect(file);
    workers[0].crash();

    await expect(pending).rejects.toMatchObject({ code: 'MALFORMED_PDF' });
    expect(workers[0].terminated).toBe(true);

    void unlocker.inspect(file);
    expect(workers).toHaveLength(2);
  });

  it('terminates the worker on dispose', () => {
    const { unlocker, workers } = setup();
    void unlocker.inspect(file).catch(() => {});
    unlocker.dispose();
    expect(workers[0].terminated).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/test/tools`
Expected: FAIL — cannot resolve `../../tools/pdfUnlock/protocol` / `client`.

- [ ] **Step 3: Implement protocol, worker, client**

`app/src/tools/pdfUnlock/protocol.ts`:

```ts
/** Keep in sync with `UnlockError::code()` in tools/pdf-unlock/src/error.rs. */
export const UNLOCK_CODES = ['NOT_ENCRYPTED', 'WRONG_PASSWORD', 'UNSUPPORTED_ENCRYPTION', 'MALFORMED_PDF'] as const;
export type UnlockCode = (typeof UNLOCK_CODES)[number];

/** WASM errors carry their code as the message; anything else is a generic failure. */
export function toUnlockCode(value: unknown): UnlockCode {
  const message = value instanceof Error ? value.message : String(value);
  return (UNLOCK_CODES as readonly string[]).includes(message) ? (message as UnlockCode) : 'MALFORMED_PDF';
}

export interface Inspection {
  encrypted: boolean;
  needsPassword: boolean;
}

// The File itself is posted (a cheap handle, not a copy) and read in the worker.
export type WorkerRequest =
  | { id: number; op: 'inspect'; file: Blob }
  | { id: number; op: 'unlock'; file: Blob; password: string };

export type WorkerResponse =
  | { id: number; ok: true; op: 'inspect'; inspection: Inspection }
  | { id: number; ok: true; op: 'unlock'; pdf: ArrayBuffer }
  | { id: number; ok: false; code: UnlockCode };
```

`app/src/tools/pdfUnlock/worker.ts`:

```ts
import init, { inspect, unlock } from '../../wasm/pdf-unlock/pdf_unlock.js';
import wasmUrl from '../../wasm/pdf-unlock/pdf_unlock_bg.wasm?url';
import { toUnlockCode, type WorkerRequest, type WorkerResponse } from './protocol';

// Typed as Worker because the app's tsconfig only has DOM libs; the
// postMessage/onmessage shapes match DedicatedWorkerGlobalScope.
const scope = self as unknown as Worker;
const ready = init({ module_or_path: wasmUrl });

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  let response: WorkerResponse;
  const transfer: Transferable[] = [];
  try {
    await ready;
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    if (request.op === 'inspect') {
      const result = inspect(bytes);
      response = {
        id: request.id,
        ok: true,
        op: 'inspect',
        inspection: { encrypted: result.encrypted, needsPassword: result.needsPassword },
      };
      result.free();
    } else {
      const pdf = unlock(bytes, request.password);
      // wasm-bindgen returns a fresh copy, so its buffer is safe to transfer.
      response = { id: request.id, ok: true, op: 'unlock', pdf: pdf.buffer as ArrayBuffer };
      transfer.push(pdf.buffer);
    }
  } catch (err) {
    response = { id: request.id, ok: false, code: toUnlockCode(err) };
  }
  scope.postMessage(response, transfer);
};
```

`app/src/tools/pdfUnlock/client.ts`:

```ts
import type { Inspection, UnlockCode, WorkerRequest, WorkerResponse } from './protocol';

export class UnlockFailure extends Error {
  readonly code: UnlockCode;
  constructor(code: UnlockCode) {
    super(code);
    this.name = 'UnlockFailure';
    this.code = code;
  }
}

export interface PdfUnlocker {
  inspect(file: Blob): Promise<Inspection>;
  unlock(file: Blob, password: string): Promise<Uint8Array>;
  /** Terminates the worker; pending requests reject. */
  dispose(): void;
}

/** The slice of `Worker` the client uses — lets tests pass a fake. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

const spawnWorker: WorkerFactory = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

type Success = Extract<WorkerResponse, { ok: true }>;
interface Pending {
  resolve: (response: Success) => void;
  reject: (failure: UnlockFailure) => void;
}

export function createPdfUnlocker(factory: WorkerFactory = spawnWorker): PdfUnlocker {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  const failAll = (code: UnlockCode) => {
    for (const request of pending.values()) request.reject(new UnlockFailure(code));
    pending.clear();
  };

  const getWorker = (): WorkerLike => {
    if (worker) return worker;
    const spawned = factory();
    spawned.onmessage = (event) => {
      const response = event.data;
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.ok) request.resolve(response);
      else request.reject(new UnlockFailure(response.code));
    };
    spawned.onerror = (event) => {
      event.preventDefault();
      // The worker failed to load or crashed; don't reuse it.
      spawned.terminate();
      worker = null;
      failAll('MALFORMED_PDF');
    };
    worker = spawned;
    return spawned;
  };

  const send = (build: (id: number) => WorkerRequest) =>
    new Promise<Success>((resolve, reject) => {
      const target = getWorker();
      const id = nextId++;
      pending.set(id, { resolve, reject });
      target.postMessage(build(id));
    });

  return {
    async inspect(file) {
      const response = await send((id) => ({ id, op: 'inspect', file }));
      if (response.op !== 'inspect') throw new UnlockFailure('MALFORMED_PDF');
      return response.inspection;
    },
    async unlock(file, password) {
      const response = await send((id) => ({ id, op: 'unlock', file, password }));
      if (response.op !== 'unlock') throw new UnlockFailure('MALFORMED_PDF');
      return new Uint8Array(response.pdf);
    },
    dispose() {
      worker?.terminate();
      worker = null;
      failAll('MALFORMED_PDF');
    },
  };
}
```

In `app/vite.config.ts`, add inside `defineConfig({ … })` after `plugins: [react()],`:

```ts
  worker: {
    // The worker imports the wasm-bindgen ES module glue.
    format: 'es',
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/test/tools && npm run lint`
Expected: 8 tests PASS; no lint errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/tools app/src/test/tools app/vite.config.ts
git commit -m "feat(tools): web worker + promise client for the pdf-unlock wasm"
```

---

### Task 7: PDF Unlock page

**Files:**
- Create: `app/src/tools/pdfUnlock/filename.ts`
- Create: `app/src/pages/PdfUnlock.tsx`
- Modify: `app/src/lib/labels.ts` (four keys, both themes)
- Test: `app/src/test/tools/pdfUnlockFilename.test.ts`, `app/src/test/pages/PdfUnlock.test.tsx`

**Interfaces:**
- Consumes: `createPdfUnlocker`, `UnlockFailure`, `PdfUnlocker` (Task 6); `UnlockCode`, `Inspection` (Task 6); `PageTransition`, `PixelPanel`, `PixelButton`, `LockIcon`, `useTheme`, `useLabels` (existing).
- Produces: `unlockedFilename(name: string): string`; default export `PdfUnlock` page component; label keys `toolsTitle`, `toolsSub`, `pdfUnlockTitle`, `pdfUnlockSub` (Task 8 uses `toolsTitle`, `toolsSub`, `pdfUnlockTitle`).

- [ ] **Step 1: Write the failing tests**

`app/src/test/tools/pdfUnlockFilename.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { unlockedFilename } from '../../tools/pdfUnlock/filename';

describe('unlockedFilename', () => {
  it.each([
    ['statement.pdf', 'statement-unlocked.pdf'],
    ['REPORT.PDF', 'REPORT-unlocked.pdf'],
    ['a.b.pdf', 'a.b-unlocked.pdf'],
    ['no-extension', 'no-extension-unlocked.pdf'],
    ['.pdf', 'document-unlocked.pdf'],
    ['   .pdf', 'document-unlocked.pdf'],
  ])('%s → %s', (input, expected) => {
    expect(unlockedFilename(input)).toBe(expected);
  });
});
```

`app/src/test/pages/PdfUnlock.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PdfUnlock from '../../pages/PdfUnlock';
import { ThemeProvider } from '../../context/ThemeContext';
import { UnlockFailure } from '../../tools/pdfUnlock/client';
import type { Inspection } from '../../tools/pdfUnlock/protocol';

const mocks = vi.hoisted(() => ({ inspect: vi.fn(), unlock: vi.fn(), dispose: vi.fn() }));

vi.mock('../../tools/pdfUnlock/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tools/pdfUnlock/client')>();
  return { ...actual, createPdfUnlocker: () => mocks };
});

const LOCKED: Inspection = { encrypted: true, needsPassword: true };
const pdfFile = (name = 'statement.pdf') => new File(['%PDF-1.7'], name, { type: 'application/pdf' });

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <PdfUnlock />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function unlockWithPassword(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(await screen.findByLabelText(/password for statement\.pdf/i), password);
  await user.click(screen.getByRole('button', { name: /^unlock$/i }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:unlocked') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
});

describe('PdfUnlock page', () => {
  it('asks for the password, then offers the unlocked download', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const user = userEvent.setup();
    renderPage();

    const file = pdfFile();
    await user.upload(screen.getByLabelText(/choose a pdf/i), file);
    await unlockWithPassword(user, 'secret');

    const link = await screen.findByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', 'blob:unlocked');
    expect(link).toHaveAttribute('download', 'statement-unlocked.pdf');
    expect(mocks.unlock).toHaveBeenCalledWith(file, 'secret');
  });

  it('unlocks owner-only PDFs without asking for a password', async () => {
    mocks.inspect.mockResolvedValue({ encrypted: true, needsPassword: false });
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    const file = pdfFile();
    await user.upload(screen.getByLabelText(/choose a pdf/i), file);

    expect(await screen.findByRole('link', { name: /download/i })).toBeInTheDocument();
    expect(mocks.unlock).toHaveBeenCalledWith(file, '');
    expect(screen.queryByLabelText(/password for/i)).toBeNull();
  });

  it('stays on the password step after a wrong password and lets the user retry', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock
      .mockRejectedValueOnce(new UnlockFailure('WRONG_PASSWORD'))
      .mockResolvedValueOnce(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't work/i);
    const field = screen.getByLabelText(/password for statement\.pdf/i);
    await user.clear(field);
    await user.type(field, 'right');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));

    expect(await screen.findByRole('link', { name: /download/i })).toBeInTheDocument();
    expect(mocks.unlock).toHaveBeenLastCalledWith(expect.any(File), 'right');
  });

  it('passes the password exactly as typed', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, '  spaced pw ');

    await screen.findByRole('link', { name: /download/i });
    expect(mocks.unlock).toHaveBeenCalledWith(expect.any(File), '  spaced pw ');
  });

  it.each([
    [{ encrypted: false, needsPassword: false }, null, /isn't password-protected/i],
    [null, 'UNSUPPORTED_ENCRYPTION', /can't remove/i],
    [null, 'MALFORMED_PDF', /couldn't read this file/i],
  ] as const)('explains inspect outcome %#', async (inspection, code, message) => {
    if (inspection) mocks.inspect.mockResolvedValue(inspection);
    else mocks.inspect.mockRejectedValue(new UnlockFailure(code!));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it('ignores the result for a file that was replaced mid-flight', async () => {
    let resolveFirst!: (value: Inspection) => void;
    mocks.inspect
      .mockImplementationOnce(() => new Promise<Inspection>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(LOCKED);
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText(/choose a pdf/i);
    await user.upload(input, pdfFile('first.pdf'));
    await user.upload(input, pdfFile('second.pdf'));
    expect(await screen.findByLabelText(/password for second\.pdf/i)).toBeInTheDocument();

    await act(async () => {
      resolveFirst({ encrypted: true, needsPassword: false });
    });

    expect(mocks.unlock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password for second\.pdf/i)).toBeInTheDocument();
  });

  it('"Unlock another" revokes the download URL and clears the password', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'secret');
    await user.click(await screen.findByRole('button', { name: /unlock another/i }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unlocked');
    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    expect(await screen.findByLabelText(/password for statement\.pdf/i)).toHaveValue('');
  });

  it('revokes the URL and stops the worker when leaving the page', async () => {
    mocks.inspect.mockResolvedValue(LOCKED);
    mocks.unlock.mockResolvedValue(new Uint8Array([1]));
    const user = userEvent.setup();
    const { unmount } = renderPage();

    await user.upload(screen.getByLabelText(/choose a pdf/i), pdfFile());
    await unlockWithPassword(user, 'secret');
    await screen.findByRole('link', { name: /download/i });
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unlocked');
    expect(mocks.dispose).toHaveBeenCalled();
  });

  it('explains that everything stays local and links to the source', () => {
    renderPage();
    expect(screen.getByText(/never leave this browser tab/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read the source/i })).toHaveAttribute(
      'href',
      'https://github.com/jgarcesres/resume/tree/main/tools/pdf-unlock',
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/test/tools/pdfUnlockFilename.test.ts src/test/pages/PdfUnlock.test.tsx`
Expected: FAIL — cannot resolve `../../tools/pdfUnlock/filename` and `../../pages/PdfUnlock`.

- [ ] **Step 3: Implement filename helper and labels**

`app/src/tools/pdfUnlock/filename.ts`:

```ts
/** `statement.pdf` → `statement-unlocked.pdf`; falls back to `document` for an empty base name. */
export function unlockedFilename(name: string): string {
  const base = name.replace(/\.pdf$/i, '').trim() || 'document';
  return `${base}-unlocked.pdf`;
}
```

In `app/src/lib/labels.ts`, add to `rpgLabels` (after `pressStart`):

```ts
  toolsTitle: 'The Forge',
  toolsSub: 'Handy spells that run entirely in your browser.',
  pdfUnlockTitle: 'Unseal a Scroll',
  pdfUnlockSub: 'Remove the password from a PDF you already know the password to.',
```

and to `proLabels` (after `pressStart`):

```ts
  toolsTitle: 'Tools',
  toolsSub: 'Small utilities that run entirely in your browser.',
  pdfUnlockTitle: 'PDF Unlock',
  pdfUnlockSub: 'Remove the password from a PDF you already know the password to.',
```

- [ ] **Step 4: Implement the page**

`app/src/pages/PdfUnlock.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import PixelButton from '../components/ui/PixelButton';
import { LockIcon } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';
import { createPdfUnlocker, UnlockFailure, type PdfUnlocker } from '../tools/pdfUnlock/client';
import { unlockedFilename } from '../tools/pdfUnlock/filename';
import type { UnlockCode } from '../tools/pdfUnlock/protocol';

const SOURCE_URL = 'https://github.com/jgarcesres/resume/tree/main/tools/pdf-unlock';

const ERROR_MESSAGES: Record<UnlockCode, string> = {
  NOT_ENCRYPTED: "This PDF isn't password-protected, so there's nothing to remove.",
  WRONG_PASSWORD: "That password didn't work. Check it and try again.",
  UNSUPPORTED_ENCRYPTION:
    "This PDF uses encryption this tool can't remove (for example certificate-based encryption, or a non-ASCII password on an older RC4/AES-128 file).",
  MALFORMED_PDF: "Couldn't read this file. Make sure it's a valid PDF.",
};

const RPG_UI = {
  text: 'font-pixel text-[9px] leading-relaxed text-rpg-text',
  dim: 'font-pixel text-[8px] leading-relaxed text-rpg-text-dim',
  error: 'font-pixel text-[9px] leading-relaxed text-neon-magenta',
  link: 'text-neon-cyan underline',
  drop: 'border-2 border-dashed border-neon-cyan/40 hover:border-neon-cyan',
  dropActive: 'border-neon-cyan bg-neon-cyan/10',
  input:
    'w-full bg-rpg-deep border-2 border-neon-cyan/40 px-3 py-2 font-mono text-sm text-rpg-text-bright focus:outline-none focus:border-neon-cyan',
  download:
    'inline-block font-pixel text-[10px] uppercase tracking-wider px-5 py-3 border-2 border-neon-gold/60 bg-neon-gold/10 text-neon-gold hover:bg-neon-gold/20',
};

const PRO_UI: typeof RPG_UI = {
  text: 'text-[14px] leading-relaxed text-pro-ink',
  dim: 'text-[13px] leading-relaxed text-pro-muted',
  error: 'text-[13px] leading-relaxed text-pro-led-red',
  link: 'text-pro-accent underline',
  drop: 'border border-dashed border-pro-rule-strong hover:border-pro-accent',
  dropActive: 'border-pro-accent bg-pro-accent-tint',
  input:
    'w-full bg-pro-bg border border-pro-rule-strong px-3 py-2 font-mono text-sm text-pro-ink focus:outline-none focus:border-pro-accent',
  download:
    'inline-block font-sans text-[13px] font-medium tracking-wide px-5 py-2.5 border bg-pro-accent text-pro-bg border-pro-accent hover:bg-pro-accent-soft',
};

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy'; file: File; step: 'Checking' | 'Unlocking' }
  | { kind: 'password'; file: File; wrong: boolean }
  | { kind: 'done'; file: File; url: string }
  | { kind: 'error'; code: UnlockCode };

/** Mutable, non-rendered state. `generation` invalidates in-flight work. */
interface Session {
  generation: number;
  url: string | null;
  unlocker: PdfUnlocker | null;
}

function PdfUnlock() {
  const { isRpg } = useTheme();
  const L = useLabels();
  const ui = isRpg ? RPG_UI : PRO_UI;
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [dragging, setDragging] = useState(false);
  const session = useRef<Session>({ generation: 0, url: null, unlocker: null });

  useEffect(() => {
    const s = session.current;
    return () => {
      s.generation++;
      if (s.url) URL.revokeObjectURL(s.url);
      s.url = null;
      s.unlocker?.dispose();
      s.unlocker = null;
    };
  }, []);

  const unlocker = () => (session.current.unlocker ??= createPdfUnlocker());

  const releaseUrl = () => {
    const s = session.current;
    if (s.url) URL.revokeObjectURL(s.url);
    s.url = null;
  };

  async function runUnlock(file: File, typedPassword: string | null) {
    const generation = ++session.current.generation;
    const isStale = () => generation !== session.current.generation;
    try {
      let pw = typedPassword;
      if (pw === null) {
        setPhase({ kind: 'busy', file, step: 'Checking' });
        const info = await unlocker().inspect(file);
        if (isStale()) return;
        if (!info.encrypted) {
          setPhase({ kind: 'error', code: 'NOT_ENCRYPTED' });
          return;
        }
        if (info.needsPassword) {
          setPhase({ kind: 'password', file, wrong: false });
          return;
        }
        pw = '';
      }
      setPhase({ kind: 'busy', file, step: 'Unlocking' });
      const pdf = await unlocker().unlock(file, pw);
      if (isStale()) return;
      releaseUrl();
      const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      session.current.url = url;
      setPassword('');
      setPhase({ kind: 'done', file, url });
    } catch (err) {
      if (isStale()) return;
      const code = err instanceof UnlockFailure ? err.code : 'MALFORMED_PDF';
      if (code === 'WRONG_PASSWORD') {
        setPhase({ kind: 'password', file, wrong: true });
        return;
      }
      setPassword('');
      setPhase({ kind: 'error', code });
    }
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    releaseUrl();
    setPassword('');
    void runUnlock(file, null);
  }

  function reset() {
    session.current.generation++;
    releaseUrl();
    setPassword('');
    setPhase({ kind: 'idle' });
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    chooseFile(file);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (phase.kind === 'password') void runUnlock(phase.file, password);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {isRpg ? (
          <h1 className="font-pixel text-lg text-rpg-text-bright">{L.pdfUnlockTitle}</h1>
        ) : (
          <div className="pt-4 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="pro-label">06 / {L.toolsTitle}</span>
              <span className="flex-1 h-px bg-pro-rule" aria-hidden />
            </div>
            <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">{L.pdfUnlockTitle}</h1>
          </div>
        )}
        <p className={ui.dim}>{L.pdfUnlockSub}</p>

        <PixelPanel glow="cyan">
          {phase.kind === 'done' ? (
            <div className="space-y-4 text-center">
              <p className={ui.text}>
                Unlocked <strong>{phase.file.name}</strong>. The copy below has no password.
              </p>
              <a href={phase.url} download={unlockedFilename(phase.file.name)} className={ui.download}>
                Download {unlockedFilename(phase.file.name)}
              </a>
              <div>
                <PixelButton variant="magenta" onClick={reset}>
                  Unlock another
                </PixelButton>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`block cursor-pointer p-8 text-center transition-colors ${ui.drop} ${dragging ? ui.dropActive : ''}`}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Choose a PDF"
                className="sr-only"
                onChange={onInputChange}
              />
              <LockIcon className="w-8 h-8 mx-auto mb-3" />
              <span className={ui.text}>Drop a PDF here, or click to pick one</span>
            </label>
          )}

          <div role="status" aria-live="polite" className="mt-4 min-h-[1.25rem]">
            {phase.kind === 'busy' && (
              <span className={ui.dim}>
                {phase.step} {phase.file.name}…
              </span>
            )}
          </div>

          {phase.kind === 'error' && (
            <p role="alert" className={ui.error}>
              {ERROR_MESSAGES[phase.code]}
            </p>
          )}

          {phase.kind === 'password' && (
            <form onSubmit={onSubmit} className="space-y-3">
              <label htmlFor="pdf-password" className={`block ${ui.text}`}>
                Password for {phase.file.name}
              </label>
              <input
                id="pdf-password"
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={phase.wrong || undefined}
                aria-describedby={phase.wrong ? 'pdf-password-error' : undefined}
                className={ui.input}
              />
              {phase.wrong && (
                <p id="pdf-password-error" role="alert" className={ui.error}>
                  {ERROR_MESSAGES.WRONG_PASSWORD}
                </p>
              )}
              <PixelButton variant="gold">Unlock</PixelButton>
            </form>
          )}
        </PixelPanel>

        <PixelPanel title="Privacy">
          <ul className={`space-y-2 ${ui.text}`}>
            <li>Your PDF and password never leave this browser tab: nothing is uploaded, logged, or stored.</li>
            <li>Decryption runs in a Web Worker, using a Rust library compiled to WebAssembly.</li>
            <li>
              Don't take my word for it: watch your browser's network tab while you unlock, or{' '}
              <a className={ui.link} href={SOURCE_URL} target="_blank" rel="noreferrer">
                read the source
              </a>
              .
            </li>
          </ul>
        </PixelPanel>
      </div>
    </PageTransition>
  );
}

export default PdfUnlock;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd app && npx vitest run src/test/tools src/test/pages/PdfUnlock.test.tsx && npm run lint`
Expected: all PASS (6 filename + 11 page + Task 6's 8); no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/PdfUnlock.tsx app/src/tools/pdfUnlock/filename.ts app/src/lib/labels.ts app/src/test/pages/PdfUnlock.test.tsx app/src/test/tools/pdfUnlockFilename.test.ts
git commit -m "feat(tools): PDF unlock page"
```

---

### Task 8: Tools index, routes, nav item, and anvil icon

**Files:**
- Create: `app/src/pages/Tools.tsx`
- Modify: `app/src/components/ui/PixelIcons.tsx` (add `AnvilIcon` directly below `CastleIcon`)
- Modify: `app/src/components/Navbar.tsx` (import + nav item)
- Modify: `app/src/App.tsx` (lazy routes)
- Test: `app/src/test/pages/Tools.test.tsx`, `app/src/test/components/Navbar.test.tsx`, `app/src/test/App.test.tsx`

**Interfaces:**
- Consumes: label keys `toolsTitle`, `toolsSub`, `pdfUnlockTitle`, `pdfUnlockSub` (Task 7); `PdfUnlock` page (Task 7); `LockIcon`, `PixelIconProps` (existing).
- Produces: default export `Tools` page; `AnvilIcon(props: PixelIconProps)`; routes `/tools`, `/tools/pdf-unlock`.

- [ ] **Step 1: Write the failing tests**

`app/src/test/pages/Tools.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Tools from '../../pages/Tools';
import { ThemeProvider } from '../../context/ThemeContext';

function renderTools() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Tools />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Tools page', () => {
  beforeEach(() => localStorage.clear());

  it('links to the PDF unlock tool', () => {
    renderTools();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tools');
    expect(screen.getByRole('link', { name: /pdf unlock/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });

  it('uses RPG naming in RPG mode', () => {
    localStorage.setItem('site-theme', 'rpg');
    renderTools();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The Forge');
    expect(screen.getByRole('link', { name: /unseal a scroll/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });
});
```

Append to `app/src/test/components/Navbar.test.tsx`:

```tsx
describe('Navbar tools link', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('links to /tools as "Tools"', () => {
    renderNavbar();
    const links = screen.getAllByRole('link', { name: /tools/i });
    expect(links.some((link) => link.getAttribute('href') === '/tools')).toBe(true);
  });

  it('calls it "Forge" in RPG mode', () => {
    localStorage.setItem('site-theme', 'rpg');
    renderNavbar();
    const links = screen.getAllByRole('link', { name: /forge/i });
    expect(links.some((link) => link.getAttribute('href') === '/tools')).toBe(true);
  });
});
```

In `app/src/test/App.test.tsx`, change the vitest import to `import { afterEach, describe, it, expect } from 'vitest';` and append inside the `describe('App', …)` block:

```tsx
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('serves the tools index at /tools', async () => {
    window.history.pushState({}, '', '/tools');
    render(<App />);
    expect(await screen.findByRole('link', { name: /pdf unlock/i })).toHaveAttribute('href', '/tools/pdf-unlock');
  });

  it('serves the PDF unlock tool at /tools/pdf-unlock', async () => {
    window.history.pushState({}, '', '/tools/pdf-unlock');
    render(<App />);
    expect(await screen.findByLabelText(/choose a pdf/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/test/pages/Tools.test.tsx src/test/components/Navbar.test.tsx src/test/App.test.tsx`
Expected: FAIL — `../../pages/Tools` missing; no Tools/Forge link; `/tools` routes render nothing.

- [ ] **Step 3: Add the icon**

In `app/src/components/ui/PixelIcons.tsx`, directly below the `CastleIcon` function, add:

```tsx
/** Pixel art anvil with sparks for Tools / the Forge */
export function AnvilIcon({ className, style }: PixelIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ ...style, ...px }} aria-hidden="true">
      <rect x="2" y="7" width="20" height="3" fill="currentColor" />
      <rect x="0" y="7" width="3" height="2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="10" width="14" height="2" fill="currentColor" opacity="0.85" />
      <rect x="9" y="12" width="6" height="5" fill="currentColor" opacity="0.7" />
      <rect x="6" y="17" width="12" height="3" fill="currentColor" />
      <rect x="4" y="20" width="16" height="2" fill="currentColor" opacity="0.6" />
      <motion.g animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity }}>
        <rect x="16" y="4" width="2" height="2" fill="#ffd700" />
        <rect x="19" y="2" width="2" height="2" fill="#ff6a00" />
      </motion.g>
    </svg>
  );
}
```

- [ ] **Step 4: Implement the Tools page**

`app/src/pages/Tools.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import PageTransition from '../components/PageTransition';
import PixelPanel from '../components/ui/PixelPanel';
import { LockIcon, type PixelIconProps } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';

type LabelKey = keyof ReturnType<typeof useLabels>;

interface Tool {
  to: string;
  titleKey: LabelKey;
  descriptionKey: LabelKey;
  stack: string;
  Icon: ComponentType<PixelIconProps>;
}

// Adding a tool = one entry here + a route in App.tsx.
const tools: Tool[] = [
  {
    to: '/tools/pdf-unlock',
    titleKey: 'pdfUnlockTitle',
    descriptionKey: 'pdfUnlockSub',
    stack: 'Rust · WebAssembly · runs locally',
    Icon: LockIcon,
  },
];

function Tools() {
  const { isRpg } = useTheme();
  const L = useLabels();

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {isRpg ? (
          <div className="space-y-2">
            <h1 className="font-pixel text-lg text-rpg-text-bright">{L.toolsTitle}</h1>
            <p className="font-pixel text-[8px] text-rpg-text-dim">{L.toolsSub}</p>
          </div>
        ) : (
          <div className="pt-4 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="pro-label">06 / {L.toolsTitle}</span>
              <span className="flex-1 h-px bg-pro-rule" aria-hidden />
            </div>
            <h1 className="pro-display text-[40px] leading-none tracking-tight text-pro-ink">{L.toolsTitle}</h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pro-muted">{L.toolsSub}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool, i) => (
            <Link key={tool.to} to={tool.to} className="block group">
              <PixelPanel glow="cyan" delay={i * 0.05} className="h-full">
                <tool.Icon className={`w-8 h-8 mb-3 ${isRpg ? 'text-neon-cyan' : 'text-pro-accent'}`} />
                <h2
                  className={
                    isRpg
                      ? 'font-pixel text-[11px] text-rpg-text-bright group-hover:text-neon-gold mb-2'
                      : 'pro-display text-[22px] text-pro-ink group-hover:text-pro-accent mb-2'
                  }
                >
                  {L[tool.titleKey]}
                </h2>
                <p className={isRpg ? 'font-pixel text-[8px] leading-relaxed text-rpg-text' : 'text-[14px] text-pro-ink-soft'}>
                  {L[tool.descriptionKey]}
                </p>
                <p className={isRpg ? 'font-pixel text-[7px] text-rpg-text-dim mt-3' : 'font-mono text-[11px] text-pro-muted mt-3'}>
                  {tool.stack}
                </p>
              </PixelPanel>
            </Link>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

export default Tools;
```

- [ ] **Step 5: Add the nav item**

In `app/src/components/Navbar.tsx`, add `AnvilIcon,` to the `./ui/PixelIcons` import list (after `CastleIcon,`), and append to `navItems` after the homelab entry:

```ts
  { to: '/tools', rpgLabel: 'Forge', proLabel: 'Tools', Icon: AnvilIcon },
```

- [ ] **Step 6: Add the lazy routes**

In `app/src/App.tsx`, change `import { useEffect, useState } from 'react';` to:

```tsx
import { lazy, Suspense, useEffect, useState } from 'react';
```

add below the page imports (after `import SkillTreePage from './pages/SkillTreePage';`):

```tsx
// Tools are code-split so the WASM worker only loads for visitors who open one.
const Tools = lazy(() => import('./pages/Tools'));
const PdfUnlock = lazy(() => import('./pages/PdfUnlock'));
```

and add inside `<Routes>` after the `/credits` route:

```tsx
            <Route path="/tools" element={<Suspense fallback={null}><Tools /></Suspense>} />
            <Route path="/tools/pdf-unlock" element={<Suspense fallback={null}><PdfUnlock /></Suspense>} />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd app && npm test && npm run lint`
Expected: the whole suite PASSES (new Tools, Navbar, and App tests included); no lint errors.

- [ ] **Step 8: Commit**

```bash
git add app/src/pages/Tools.tsx app/src/components/ui/PixelIcons.tsx app/src/components/Navbar.tsx app/src/App.tsx app/src/test
git commit -m "feat(tools): tools index, Forge/Tools nav item, and lazy routes"
```

---

### Task 9: End-to-end verification in a real browser

Run this task in the main session: it needs the browser pane.

**Files:**
- Create (only if missing): `.claude/launch.json`
- No product code changes expected; if a check fails, fix it in the owning task's files and re-run that task's tests.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Static checks**

Run: `cd app && npm run lint && npm test && npm run build && /bin/ls dist/assets | grep -E "worker|\.wasm$"`
Expected: lint clean; all tests pass; build succeeds; the listing shows a `worker-*.js` chunk and a `pdf_unlock_bg-*.wasm` asset.

Run: `cd app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "src/(tools|pages/(Tools|PdfUnlock)|test/(tools|pages/(Tools|PdfUnlock)))" ; echo "new-file type errors: $?"`
Expected: no matching lines, then `new-file type errors: 1` (grep found nothing). Pre-existing errors elsewhere are out of scope; `src/test/wasm` is excluded because the app has no `@types/node`.

Run: `grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie" app/src/tools app/src/pages/PdfUnlock.tsx app/src/pages/Tools.tsx ; echo "privacy grep: $?"`
Expected: no matches, then `privacy grep: 1`.

- [ ] **Step 2: Serve the production build**

If `.claude/launch.json` doesn't define it, add a configuration:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "app-preview",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["--prefix", "app", "run", "preview", "--", "--port", "4173", "--strictPort"],
      "port": 4173
    }
  ]
}
```

Start it with the browser pane's `preview_start` (name `app-preview`) and open `http://localhost:4173/tools`. Check the Tools card renders and links to `/tools/pdf-unlock`; check the nav shows "Tools" (and "Forge" after enabling RPG mode via the pixel cat).

- [ ] **Step 3: Unlock a fixture through the real UI**

Get the fixture as base64: `base64 -i tools/pdf-unlock/tests/fixtures/aes-256.pdf | tr -d '\n'`. On `/tools/pdf-unlock`, run in the page (paste the base64 in place of `B64`):

```js
const bytes = Uint8Array.from(atob('B64'), (c) => c.charCodeAt(0));
const file = new File([bytes], 'aes-256.pdf', { type: 'application/pdf' });
const dt = new DataTransfer();
dt.items.add(file);
const input = document.querySelector('input[type=file]');
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
```

Expected: a "Password for aes-256.pdf" field appears. Type `nope` and submit → the inline "didn't work" error. Type `user` and submit → a "Download aes-256-unlocked.pdf" link. Then check the network requests: only same-origin GETs for page assets, the worker chunk, and the `.wasm` — no POST/PUT and no request carrying file data.

Repeat with `rc4-128.pdf` and the owner password `owner` (legacy recovery path) → a download link. Repeat with `aes-256-owner-only.pdf` → a download link with no password prompt.

- [ ] **Step 4: Large-file responsiveness (Review Focus #5)**

Generate a ~50 MB encrypted PDF in the scratchpad (not committed):

```bash
python3 - <<'EOF'
import os
blob = os.urandom(50 * 1024 * 1024)
content = b"BT /F1 24 Tf 72 700 Td (Big fixture) Tj ET"
objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> >>",
    b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length %d >>\nstream\n" % len(blob) + blob + b"\nendstream",
]
out = bytearray(b"%PDF-1.7\n"); offs = []
for i, o in enumerate(objs, 1):
    offs.append(len(out)); out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
x = len(out)
out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
for o in offs: out += b"%010d 00000 n \n" % o
out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
open("big-src.pdf", "wb").write(out)
EOF
qpdf --encrypt --user-password=user --owner-password=owner --bits=256 -- big-src.pdf big-aes-256.pdf </dev/null
```

Load it the way Step 3 does, but read the file from a local static server instead of base64 (e.g. `python3 -m http.server 8765` in the scratchpad, then `fetch('http://localhost:8765/big-aes-256.pdf')` in the page — this test-harness fetch is the only extra request expected). Expected: the "Checking…" / "Unlocking…" status shows, the page stays scrollable and clickable while it works, and a download link appears (or, if memory runs out, an error message — never a stuck spinner). Record the elapsed time.

- [ ] **Step 5: Stop the servers and report**

Stop the preview server (`preview_stop`) and the static server. Summarize what passed, with the observed large-file time. No commit unless a fix was needed.
