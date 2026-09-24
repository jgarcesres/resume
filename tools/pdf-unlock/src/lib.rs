//! Remove the password from a PDF when the caller knows it.
//!
//! The core is plain Rust, tested natively with `cargo test`; `wasm.rs`
//! exposes it to the browser through wasm-bindgen.

mod error;
mod pdf;

pub use error::UnlockError;
pub use pdf::{Inspection, inspect, unlock};
