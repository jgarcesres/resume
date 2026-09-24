use lopdf::{Document, Object, dictionary};
use pdf_unlock::{Inspection, UnlockError, inspect, unlock};

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

const TEXT: &str = "Hello from the unlock fixture";

/// Parses unlock output and returns page 1's text, asserting no encryption survived.
fn unlocked_text(pdf: &[u8]) -> String {
    let doc = Document::load_mem(pdf).expect("unlocked output should parse");
    assert!(
        !doc.is_encrypted() && !doc.was_encrypted(),
        "output must not be encrypted"
    );
    assert!(
        doc.trailer.get(b"Encrypt").is_err(),
        "output trailer must not reference /Encrypt"
    );
    // /Size must be one more than the highest object number (strict readers warn otherwise).
    let highest = doc.objects.keys().map(|&(id, _)| id).max().unwrap_or(0);
    let size = doc
        .trailer
        .get(b"Size")
        .and_then(Object::as_i64)
        .expect("trailer /Size");
    assert_eq!(size, i64::from(highest) + 1, "trailer /Size");
    doc.extract_text(&[1])
        .expect("page 1 text")
        .trim()
        .to_string()
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
    assert_eq!(
        unlock(&fixture("rc4-128-utf8"), "contraseña"),
        Err(UnlockError::UnsupportedEncryption)
    );
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
    for name in [
        "rc4-40",
        "rc4-128",
        "aes-128",
        "aes-256",
        "aes-256-objstm",
        "aes-256-utf8",
        "rc4-128-utf8",
    ] {
        assert_eq!(
            unlock(&fixture(name), "nope"),
            Err(UnlockError::WrongPassword),
            "{name}"
        );
        assert_eq!(
            unlock(&fixture(name), ""),
            Err(UnlockError::WrongPassword),
            "{name} (empty)"
        );
    }
}

#[test]
fn unlock_does_not_trim_passwords() {
    assert_eq!(
        unlock(&fixture("aes-256"), " user"),
        Err(UnlockError::WrongPassword)
    );
    assert_eq!(
        unlock(&fixture("rc4-128"), "user "),
        Err(UnlockError::WrongPassword)
    );
}

#[test]
fn unlock_reports_plain_pdfs_as_not_encrypted() {
    assert_eq!(
        unlock(&fixture("plain"), "user"),
        Err(UnlockError::NotEncrypted)
    );
}

#[test]
fn unlock_rejects_non_pdf_bytes() {
    assert_eq!(
        unlock(b"definitely not a pdf", "user"),
        Err(UnlockError::MalformedPdf)
    );
}

#[test]
fn unlock_rejects_non_standard_security_handlers() {
    assert_eq!(
        unlock(&pubsec_pdf(), "user"),
        Err(UnlockError::UnsupportedEncryption)
    );
}

#[test]
fn unlock_with_owner_password_decrypts_every_supported_cipher() {
    for name in [
        "rc4-40",
        "rc4-128",
        "aes-128",
        "aes-256",
        "aes-256-objstm",
        "aes-256-utf8",
    ] {
        let out = unlock(&fixture(name), "owner").unwrap_or_else(|e| panic!("{name}: {e}"));
        assert_eq!(unlocked_text(&out), TEXT, "{name}");
    }
}

#[test]
fn unlock_refuses_legacy_owner_password_when_the_user_password_is_non_ascii() {
    // The recovered user password ("contraseña") can't be handed to lopdf intact.
    assert_eq!(
        unlock(&fixture("rc4-128-utf8"), "owner"),
        Err(UnlockError::UnsupportedEncryption)
    );
}
