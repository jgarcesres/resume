# Add client-side AI resume chat widget powered by WebLLM (WebGPU)

## Summary

Add an "Ask my resume" floating chat widget that runs entirely in the browser using [WebLLM](https://github.com/mlc-ai/web-llm). A small quantized language model runs via WebGPU with all resume JSON content (~26KB) injected as system prompt context. Zero server cost -- all inference happens client-side.

## Scope

### Chat Engine
- Add `@mlc-ai/web-llm` npm dependency
- Target model: `SmolLM2-1.7B-Instruct-q4f16_1-MLC` (~800MB download, cached in IndexedDB after first use)
- Web Worker (`llm.worker.ts`) for off-main-thread inference
- System prompt built from all 6 JSON resource files (`structured_resume.json`, `skill_tree.json`, `projects_content.json`, `homelab_content.json`, `hobbies_content.json`, `home_content.json`)
- Streaming token output for responsive UX

### Chat UI
- Floating button in bottom-right corner (above pixel cat, below navbar)
- Clicking opens a chat panel with message list, input field, and send button
- **RPG mode**: NPC dialog style (pixel borders, RPG-themed framing, neon accents)
- **Professional mode**: clean modern chat bubble (rounded corners, subtle shadow, standard typography)
- Model download progress bar on first open (lazy initialization -- no download until user opens chat)
- Chat history in React state (session-only, cleared on page reload)
- Minimize/close functionality

### Edge Cases
- WebGPU unavailable: show informational message ("WebGPU required -- use Chrome 113+ or Edge 113+")
- Model download failure: show retry button with error message
- No server fallback -- this is intentionally client-only

## Files to Create

- `app/src/components/ChatWidget.tsx` -- floating button + panel container
- `app/src/components/chat/ChatPanel.tsx` -- message list, input, header
- `app/src/components/chat/ChatMessage.tsx` -- individual message bubble (theme-aware)
- `app/src/components/chat/ChatLoadingState.tsx` -- model download progress UI
- `app/src/hooks/useWebLLM.ts` -- hook wrapping WebLLM engine init, loading, and inference
- `app/src/workers/llm.worker.ts` -- Web Worker for WebLLM inference
- `app/src/lib/chatSystemPrompt.ts` -- builds system prompt from all JSON resources

## Files to Modify

- `app/package.json` -- add `@mlc-ai/web-llm`
- `app/src/App.tsx` -- add `<ChatWidget />` component
- `app/src/index.css` -- add z-index variable `--z-chat: 45`
- `app/vite.config.ts` -- verify worker configuration (Vite supports `?worker` imports natively)

## Acceptance Criteria

- [ ] Floating chat button visible on all pages
- [ ] First open triggers model download with visible progress indicator
- [ ] Model cached in IndexedDB after first download (no re-download on revisit)
- [ ] Users can type questions and receive streaming answers about resume content
- [ ] System prompt includes all structured data from the 6 JSON resource files
- [ ] Works in Chrome 113+ / Edge 113+ (WebGPU required)
- [ ] Shows clear, friendly message on unsupported browsers
- [ ] UI matches active theme (RPG or professional)
- [ ] Inference does not block the main thread (runs in Web Worker)
- [ ] Chat can be minimized and reopened without losing history
- [ ] All existing tests pass; new tests cover chat UI (with mocked WebLLM engine)

## Technical Notes

- `web-llm` handles model caching, WebGPU device management, and tokenization
- The ~26KB of JSON compresses to ~10-15KB of clean text in the system prompt, well within any model's context window
- SmolLM2-1.7B-Instruct is chosen for the best size/quality tradeoff for factual Q&A with provided context
- Vite natively supports Web Workers via `import Worker from './workers/llm.worker.ts?worker'`

## Dependencies

- **Depends on Issue #1** (professional theme) for theme-aware chat UI styling
