# Add configurable WebGPU post-processing shader presets for RPG mode

## Summary

Extend the existing CRT shader overlay into a configurable post-processing pipeline with multiple shader presets. Users can toggle between visual effects that enhance the RPG aesthetic. All effects are RPG-mode only. Zero server cost -- everything runs as WebGPU fragment shaders in the browser.

## Scope

### Shader Presets

| Preset | Description |
|--------|-------------|
| **None** | No overlay effect |
| **CRT** | Current CRT monitor simulation (scanlines, phosphor dots, vignette, flicker) -- no visual regression |
| **Bloom** | Subtle ambient glow that intensifies around neon-colored areas |
| **Chromatic** | RGB channel offset creating color fringing at screen edges and corners |
| **Retro** | Pixel-art dithering with Bayer matrix, posterization, and thick scanlines |
| **Matrix** | Procedural falling character rain overlay (green on transparent) |

### Architecture
- Extract existing CRT WGSL from inline string in `CrtShaderOverlay.tsx` into separate `.wgsl` files
- Shared fullscreen triangle vertex shader (`vertex.wgsl`)
- Single `ShaderOverlay.tsx` component managing one WebGPU device; pipeline swapped on preset change
- Extended uniform buffer supporting shader-specific parameters
- CSS fallback only for CRT preset (existing `.crt-overlay` class preserved)

### UI
- Replace CRT on/off toggle in Navbar with a shader preset selector
- Desktop: row of icon buttons or dropdown in nav bar
- Mobile: selector in slide-out drawer (same location as current CRT toggle)
- RPG-mode only (hidden in professional mode)

### Migration
- `useShaderPreset.ts` replaces `useCrtEffect.ts`
- Automatic one-time migration of legacy `crt-effect` localStorage key to new `shader-preset` key
- Default preset: `crt` (matches current default behavior)

## Files to Create

- `app/src/shaders/vertex.wgsl` -- shared fullscreen triangle vertex shader
- `app/src/shaders/crt.wgsl` -- extracted CRT fragment shader
- `app/src/shaders/bloom.wgsl` -- bloom/glow fragment shader
- `app/src/shaders/chromatic.wgsl` -- chromatic aberration fragment shader
- `app/src/shaders/retro.wgsl` -- retro dithering/posterization fragment shader
- `app/src/shaders/matrix.wgsl` -- matrix rain fragment shader
- `app/src/components/ShaderOverlay.tsx` -- replaces `CrtShaderOverlay.tsx`
- `app/src/components/ShaderSelector.tsx` -- navbar preset picker
- `app/src/hooks/useShaderPreset.ts` -- localStorage-backed preset hook with legacy migration

## Files to Modify

- `app/src/App.tsx` -- replace `<CrtShaderOverlay>` with `<ShaderOverlay>`, pass preset; only render when `isRpg`
- `app/src/components/Navbar.tsx` -- replace CRT toggle with `<ShaderSelector>`; RPG-mode only
- `app/src/hooks/useCrtEffect.ts` -- deprecate/remove (replaced by `useShaderPreset`)
- `app/vite.config.ts` -- add `.wgsl` raw import support (`assetsInclude` or use `?raw` suffix)

## Acceptance Criteria

- [ ] 6 shader presets selectable from Navbar in RPG mode
- [ ] CRT preset is visually identical to current `CrtShaderOverlay` behavior
- [ ] Each new shader renders correctly at 60fps on mid-range hardware
- [ ] Shaders completely disabled in professional mode
- [ ] Shader choice persisted in localStorage (key: `shader-preset`)
- [ ] Legacy `crt-effect` localStorage value migrated automatically on first load
- [ ] CSS fallback works for CRT preset when WebGPU is unavailable
- [ ] Other presets show a toast/message when WebGPU unavailable (graceful degradation)
- [ ] Switching presets does not leak GPU resources (single device, pipeline swap)
- [ ] Shader selector is keyboard-accessible
- [ ] All existing tests pass; new tests cover `useShaderPreset` hook

## Technical Notes

- All shaders are **overlay-only** (blended on top of page, no framebuffer read). Effects are limited to additive/subtractive patterns, not true post-processing. This matches the existing CRT approach.
- Fragment shaders only (no compute shaders) for broader WebGPU compatibility
- The existing `CrtShaderOverlay.tsx` WebGPU init pattern (device request, loss handling, DPR scaling, animation loop) is the foundation for `ShaderOverlay.tsx`
- WGSL files imported as raw strings via Vite's `?raw` suffix

## Dependencies

- **Depends on Issue #1** (professional theme) so shaders are correctly hidden in professional mode
