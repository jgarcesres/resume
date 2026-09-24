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
