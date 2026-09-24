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

const LOCKED: Inspection = Inspection {
    encrypted: true,
    needs_password: true,
};
const OWNER_ONLY: Inspection = Inspection {
    encrypted: true,
    needs_password: false,
};

#[test]
fn error_codes_match_the_web_ui_contract() {
    assert_eq!(UnlockError::NotEncrypted.code(), "NOT_ENCRYPTED");
    assert_eq!(UnlockError::WrongPassword.code(), "WRONG_PASSWORD");
    assert_eq!(
        UnlockError::UnsupportedEncryption.code(),
        "UNSUPPORTED_ENCRYPTION"
    );
    assert_eq!(UnlockError::MalformedPdf.code(), "MALFORMED_PDF");
    assert_eq!(UnlockError::WrongPassword.to_string(), "WRONG_PASSWORD");
}

#[test]
fn inspect_reports_plain_pdf_as_unencrypted() {
    assert_eq!(
        inspect(&fixture("plain")),
        Ok(Inspection {
            encrypted: false,
            needs_password: false
        })
    );
}

#[test]
fn inspect_reports_password_protected_pdfs() {
    for name in [
        "rc4-40",
        "rc4-128",
        "aes-128",
        "aes-256",
        "aes-256-objstm",
        "aes-256-utf8",
        "rc4-128-utf8",
    ] {
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
    assert_eq!(
        inspect(b"definitely not a pdf"),
        Err(UnlockError::MalformedPdf)
    );
    assert_eq!(inspect(b""), Err(UnlockError::MalformedPdf));
}

#[test]
fn inspect_rejects_non_standard_security_handlers() {
    assert_eq!(
        inspect(&pubsec_pdf()),
        Err(UnlockError::UnsupportedEncryption)
    );
}
