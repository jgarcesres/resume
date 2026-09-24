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
    let key = &hash[..if revision == 2 {
        5
    } else {
        key_length_bytes.clamp(5, 16)
    }];

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

/// Whether `key` is the file key derived from the *user* password: it must
/// reproduce the /U entry (ISO 32000-2 §7.6.4.4, Algorithms 4 and 5).
///
/// lopdf also accepts the empty password as an *owner* password while loading,
/// then derives the key as if it were the user password. This catches that.
pub(crate) fn key_matches_user_entry(
    key: &[u8],
    u_entry: &[u8],
    first_file_id: &[u8],
    revision: i64,
) -> bool {
    if revision == 2 {
        return u_entry.len() >= 32 && rc4(key, &PAD) == u_entry[..32];
    }
    let mut hasher = Md5::new();
    hasher.update(PAD);
    hasher.update(first_file_id);
    let mut value = rc4(key, &hasher.finalize());
    for i in 1..=19u8 {
        let round_key: Vec<u8> = key.iter().map(|b| b ^ i).collect();
        value = rc4(&round_key, &value);
    }
    u_entry.len() >= 16 && value[..] == u_entry[..16]
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
        assert_eq!(
            rc4(b"Key", b"Plaintext"),
            [0xBB, 0xF3, 0x16, 0xE8, 0xD9, 0x40, 0xAF, 0x0A, 0xD3]
        );
    }

    #[test]
    fn short_o_entry_is_rejected() {
        assert_eq!(recover_user_password(b"owner", &[0u8; 16], 3, 16), None);
    }
}
