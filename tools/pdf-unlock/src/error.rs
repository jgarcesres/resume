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
