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
    Ok(InspectResult {
        encrypted: inspection.encrypted,
        needs_password: inspection.needs_password,
    })
}

#[wasm_bindgen(js_name = unlock)]
pub fn unlock_js(bytes: &[u8], password: &str) -> Result<Vec<u8>, JsError> {
    crate::unlock(bytes, password).map_err(to_js)
}

fn to_js(err: UnlockError) -> JsError {
    JsError::new(err.code())
}
