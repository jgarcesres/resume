//! Resource limits. This is its own test binary because it installs a global
//! allocator that tracks peak heap usage.

use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

struct PeakTracking;

static CURRENT: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for PeakTracking {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = unsafe { System.alloc(layout) };
        if !ptr.is_null() {
            let now = CURRENT.fetch_add(layout.size(), Ordering::SeqCst) + layout.size();
            PEAK.fetch_max(now, Ordering::SeqCst);
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe { System.dealloc(ptr, layout) };
        CURRENT.fetch_sub(layout.size(), Ordering::SeqCst);
    }
}

#[global_allocator]
static ALLOCATOR: PeakTracking = PeakTracking;

#[test]
fn a_decompression_bomb_cannot_exhaust_memory() {
    // 2.9 KB on disk; its xref stream inflates to 1.5 GB. In the browser this
    // grew the worker to ~2.85 GB before the limit.
    let path = format!(
        "{}/tests/fixtures/xref-stream-bomb.pdf",
        env!("CARGO_MANIFEST_DIR")
    );
    let bomb = std::fs::read(path).unwrap();
    let _ = pdf_unlock::inspect(&bomb);
    let _ = pdf_unlock::unlock(&bomb, "");
    let peak_mib = PEAK.load(Ordering::SeqCst) / (1024 * 1024);
    assert!(peak_mib < 256, "peak heap {peak_mib} MiB");
}
