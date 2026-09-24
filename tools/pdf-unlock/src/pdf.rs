use flate2::read::ZlibDecoder;
use lopdf::encryption::PasswordAlgorithm;
use lopdf::{Dictionary, Document, EncryptionState, LoadOptions, Object};

use crate::UnlockError;
use crate::legacy;

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
    if doc.was_encrypted() {
        check_decrypted(&doc)?;
    }
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
            check_decrypted(&probe)?;
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
    check_decrypted(&doc)?;
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
            recovered_user_password(doc, revision, &encoded)?
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

/// Revision <= 4: turn an authenticated owner password back into the user
/// password (which the file key is derived from) and double-check it.
fn recovered_user_password(
    doc: &Document,
    revision: i64,
    owner: &[u8],
) -> Result<Vec<u8>, UnlockError> {
    let dict = doc.get_encrypted().map_err(unsupported)?;
    let o_entry = dict
        .get(b"O")
        .and_then(Object::as_str)
        .map_err(unsupported)?;
    // /Length is optional; V4 (AES-128) files are always 128-bit.
    let default_bits = if revision == 4 { 128 } else { 40 };
    let length_bits = dict
        .get(b"Length")
        .and_then(Object::as_i64)
        .unwrap_or(default_bits);
    let key_length = usize::try_from(length_bits / 8).map_err(unsupported)?;

    legacy::recover_user_password(owner, o_entry, revision, key_length)
        .filter(|user| doc.authenticate_raw_user_password(user).is_ok())
        .ok_or(UnlockError::UnsupportedEncryption)
}

fn save(mut doc: Document) -> Result<Vec<u8>, UnlockError> {
    // Decryption drops the /Encrypt dictionary, which is often the highest-numbered
    // object; lopdf would still write /Size from the old max_id.
    doc.max_id = doc.objects.keys().map(|&(id, _)| id).max().unwrap_or(0);
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
    check_crypt_filters(dict)?;
    PasswordAlgorithm::try_from(doc).map_err(unsupported)?;
    dict.get(b"R").and_then(Object::as_i64).map_err(unsupported)
}

/// Crypt filter methods lopdf 0.45 applies correctly. For anything else —
/// Identity, an unknown /CFM, or a name missing from /CF — it silently falls
/// back to RC4 and garbles the document.
const SUPPORTED_CRYPT_METHODS: [&[u8]; 3] = [b"V2", b"AESV2", b"AESV3"];

/// Refuses V4+ /Encrypt dictionaries whose crypt filters lopdf can't apply.
fn check_crypt_filters(dict: &Dictionary) -> Result<(), UnlockError> {
    if dict.get(b"V").and_then(Object::as_i64).unwrap_or(0) < 4 {
        return Ok(());
    }
    let filters = dict
        .get(b"CF")
        .and_then(Object::as_dict)
        .map_err(unsupported)?;
    let supported = |key: &[u8]| {
        dict.get(key)
            .and_then(Object::as_name)
            .and_then(|name| filters.get(name))
            .and_then(Object::as_dict)
            .and_then(|filter| filter.get(b"CFM"))
            .and_then(Object::as_name)
            .is_ok_and(|method| SUPPORTED_CRYPT_METHODS.contains(&method))
    };
    // lopdf decrypts embedded files with /StmF, so a different /EFF would be garbled.
    let eff_matches = match dict.get(b"EFF").and_then(Object::as_name) {
        Ok(eff) => dict
            .get(b"StmF")
            .and_then(Object::as_name)
            .is_ok_and(|stm| stm == eff),
        Err(_) => true,
    };
    if supported(b"StmF") && supported(b"StrF") && eff_matches {
        Ok(())
    } else {
        Err(UnlockError::UnsupportedEncryption)
    }
}

/// Post-decryption checks: refuse anything lopdf may have silently garbled.
fn check_decrypted(doc: &Document) -> Result<(), UnlockError> {
    if let Some(state) = &doc.encryption_state {
        check_state(state)?;
    }
    if has_crypt_streams(doc) || looks_garbled(doc) {
        return Err(UnlockError::UnsupportedEncryption);
    }
    Ok(())
}

/// `check_crypt_filters` for PDFs lopdf decrypted while loading (owner-only
/// files), whose /Encrypt dictionary is already gone.
fn check_state(state: &EncryptionState) -> Result<(), UnlockError> {
    if state.version() < 4 {
        return Ok(());
    }
    let supported = |name: &[u8]| {
        state
            .crypt_filters()
            .get(name)
            .is_some_and(|filter| SUPPORTED_CRYPT_METHODS.contains(&filter.method()))
    };
    if supported(state.default_stream_filter()) && supported(state.default_string_filter()) {
        Ok(())
    } else {
        Err(UnlockError::UnsupportedEncryption)
    }
}

/// lopdf leaves /Crypt in a stream's /Filter after decrypting it, which readers
/// then can't decode.
fn has_crypt_streams(doc: &Document) -> bool {
    doc.objects.values().any(|obj| match obj {
        Object::Stream(stream) => stream
            .filters()
            .is_ok_and(|filters| filters.contains(&b"Crypt".as_slice())),
        _ => false,
    })
}

/// Decrypting with the wrong key turns every stream into noise, so compressed
/// streams stop inflating. A healthy file may have the odd broken stream; most
/// of a sample failing means decryption went wrong (lopdf ignores per-object
/// decryption errors, so this is the only signal).
fn looks_garbled(doc: &Document) -> bool {
    const SAMPLE: usize = 32;
    let (mut checked, mut failed) = (0usize, 0usize);
    for obj in doc.objects.values() {
        let Object::Stream(stream) = obj else {
            continue;
        };
        if !stream
            .filters()
            .is_ok_and(|filters| filters == [b"FlateDecode".as_slice()])
        {
            continue;
        }
        checked += 1;
        let mut decoder = ZlibDecoder::new(stream.content.as_slice());
        if std::io::copy(&mut decoder, &mut std::io::sink()).is_err() {
            failed += 1;
        }
        if checked == SAMPLE {
            break;
        }
    }
    failed > 0 && failed * 2 >= checked
}

fn unsupported<E>(_: E) -> UnlockError {
    UnlockError::UnsupportedEncryption
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use flate2::Compression;
    use flate2::write::ZlibEncoder;
    use lopdf::{Dictionary, Stream, dictionary};

    use super::*;

    fn v4_dict(stmf: &str, strf: &str, cfm: &str) -> Dictionary {
        dictionary! {
            "V" => 4,
            "CF" => dictionary! { "StdCF" => dictionary! { "CFM" => cfm } },
            "StmF" => stmf,
            "StrF" => strf,
        }
    }

    fn deflate(data: &[u8]) -> Vec<u8> {
        let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).unwrap();
        encoder.finish().unwrap()
    }

    fn doc_with_streams(streams: Vec<Stream>) -> Document {
        let mut doc = Document::with_version("1.7");
        for stream in streams {
            doc.add_object(stream);
        }
        doc
    }

    fn flate_stream(content: Vec<u8>) -> Stream {
        Stream::new(dictionary! { "Filter" => "FlateDecode" }, content)
    }

    #[test]
    fn crypt_filter_dict_accepts_filters_lopdf_can_apply() {
        assert_eq!(check_crypt_filters(&dictionary! { "V" => 2 }), Ok(()));
        for cfm in ["V2", "AESV2", "AESV3"] {
            assert_eq!(
                check_crypt_filters(&v4_dict("StdCF", "StdCF", cfm)),
                Ok(()),
                "{cfm}"
            );
        }
    }

    #[test]
    fn crypt_filter_dict_refuses_what_lopdf_would_garble() {
        let refused = Err(UnlockError::UnsupportedEncryption);
        assert_eq!(
            check_crypt_filters(&v4_dict("Identity", "StdCF", "AESV2")),
            refused
        );
        assert_eq!(
            check_crypt_filters(&v4_dict("StdCF", "Identity", "AESV2")),
            refused
        );
        assert_eq!(
            check_crypt_filters(&v4_dict("StdCF", "StdCF", "None")),
            refused
        );
        let mut missing = v4_dict("StdCF", "StdCF", "AESV2");
        missing.remove(b"StmF");
        assert_eq!(check_crypt_filters(&missing), refused);
        let mut eff = v4_dict("StdCF", "StdCF", "AESV2");
        eff.set("EFF", "Identity");
        assert_eq!(check_crypt_filters(&eff), refused);
    }

    #[test]
    fn streams_still_marked_crypt_are_detected() {
        let crypt = Stream::new(
            dictionary! { "Filter" => vec![Object::from("Crypt"), Object::from("FlateDecode")] },
            vec![],
        );
        assert!(has_crypt_streams(&doc_with_streams(vec![crypt])));
        assert!(!has_crypt_streams(&doc_with_streams(vec![flate_stream(
            deflate(b"ok")
        )])));
    }

    #[test]
    fn mostly_undecodable_flate_streams_mean_garbled_decryption() {
        let good = || flate_stream(deflate(b"BT (hello) Tj ET"));
        let noise = || flate_stream(vec![0x5a, 0xc3, 0x11, 0x9e, 0x42, 0x07, 0xd1, 0x88]);
        assert!(looks_garbled(&doc_with_streams(vec![noise(), noise()])));
        assert!(!looks_garbled(&doc_with_streams(vec![good(), good()])));
        // One broken stream in an otherwise healthy file isn't a decryption failure.
        assert!(!looks_garbled(&doc_with_streams(vec![
            good(),
            good(),
            noise()
        ])));
        assert!(!looks_garbled(&doc_with_streams(vec![])));
    }
}
