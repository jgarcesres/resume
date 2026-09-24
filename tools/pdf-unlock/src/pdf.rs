use lopdf::encryption::PasswordAlgorithm;
use lopdf::{Document, LoadOptions, Object};

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
        return Ok(Inspection {
            encrypted: true,
            needs_password: true,
        });
    }
    // lopdf transparently decrypts PDFs whose user password is empty.
    Ok(Inspection {
        encrypted: doc.was_encrypted(),
        needs_password: false,
    })
}

pub fn unlock(bytes: &[u8], password: &str) -> Result<Vec<u8>, UnlockError> {
    let probe = load(bytes)?;
    if !probe.is_encrypted() {
        // Owner-only PDFs were already decrypted with the empty user password.
        return if probe.was_encrypted() {
            save(probe)
        } else {
            Err(UnlockError::NotEncrypted)
        };
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
    doc.save_to(&mut out)
        .map_err(|_| UnlockError::MalformedPdf)?;
    Ok(out)
}

fn load(bytes: &[u8]) -> Result<Document, UnlockError> {
    Document::load_mem(bytes).map_err(|_| UnlockError::MalformedPdf)
}

/// Returns the security handler revision (/R) if this is the Standard password
/// handler in a form lopdf understands.
fn standard_revision(doc: &Document) -> Result<i64, UnlockError> {
    let dict = doc.get_encrypted().map_err(unsupported)?;
    let filter = dict
        .get(b"Filter")
        .and_then(Object::as_name)
        .map_err(unsupported)?;
    if filter != b"Standard" {
        return Err(UnlockError::UnsupportedEncryption);
    }
    PasswordAlgorithm::try_from(doc).map_err(unsupported)?;
    dict.get(b"R").and_then(Object::as_i64).map_err(unsupported)
}

fn unsupported<E>(_: E) -> UnlockError {
    UnlockError::UnsupportedEncryption
}
