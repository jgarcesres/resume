# Add professional/formal default theme with pixel cat easter egg toggle

## Summary

The site currently defaults to an RPG/gaming aesthetic. Add a clean, professional theme as the **default landing experience**, with the existing RPG theme preserved as an easter egg mode unlocked by clicking the walking pixel cat.

First-time visitors should see a polished, professional resume site. The pixel cat walks along the bottom as a subtle hint -- clicking it transitions to the full RPG experience.

## Scope

### Theme System
- Rewrite `ThemeContext.tsx` to support `'professional' | 'rpg'` (default: `professional`)
- New `useTheme` hook following the `useCrtEffect.ts` localStorage pattern (key: `site-theme`)
- Wrap `<App />` in `<ThemeProvider>` in `main.tsx`
- `App.tsx`: conditionally apply root classes (`bg-white text-slate-800` vs `bg-rpg-void text-rpg-text grid-bg`)

### UI Components (theme-aware)
- Make all UI primitives branch on `isRpg` internally: `PixelPanel`, `PixelButton`, `PixelBadge`, `StatBar`, `TypewriterText`
- Professional mode: clean borders, subtle shadows, sans-serif fonts, standard color palette
- RPG mode: zero visual regression from current behavior

### Navigation
- Formal labels in professional mode:

  | RPG | Professional |
  |-----|-------------|
  | Quests | Projects |
  | Talents | Skills |
  | Skills | Hobbies |
  | Stats | Resume |
  | Base | Homelab |

- Hide CRT toggle and PARTY indicator in professional mode
- Clean navbar styling (white/light bg, subtle border, standard fonts)

### Pages (all 7)
- Swap RPG section titles to professional equivalents:
  - "Adventure Log" -> "Experience", "Training Grounds" -> "Education", "Achievements Unlocked" -> "Certifications", "Inventory" -> "Skills & Technologies", "Save Game (PDF)" -> "Download PDF"
  - "Quest Log" -> "Projects", "Side Quests" -> "Personal", "Main Quests" -> "Work"
  - "Passive Skills" -> "Hobbies & Interests", "Active Side Quests" -> "Current Projects"
  - "Tech Arsenal" -> "Technology Stack"
  - "Talent Tree" -> "Technical Skills"

### Pixel Cat Behavior
- **Professional mode**: clicking triggers theme switch to RPG (with brief transition animation)
- **RPG mode**: existing behavior ("Nya~!" on click)
- Provide a way to switch back from RPG to professional (navbar toggle or clicking cat again)

### Styling
- Add professional Tailwind palette (`pro.*` colors) and clean font family (`Inter` / `system-ui`)
- `index.css`: professional scrollbar, remove `image-rendering: pixelated` in professional mode
- CRT shader only renders in RPG mode

## Files Affected

~20 files modified, ~2 new files. Key files:

- `app/src/context/ThemeContext.tsx` (rewrite)
- `app/src/hooks/useTheme.ts` (new)
- `app/src/App.tsx`, `app/src/main.tsx`
- `app/src/components/Navbar.tsx`, `app/src/components/PixelCat.tsx`
- `app/src/components/ui/PixelPanel.tsx`, `PixelButton.tsx`, `PixelBadge.tsx`, `StatBar.tsx`
- All 7 page files in `app/src/pages/`
- `app/src/index.css`, `app/tailwind.config.js`

## Acceptance Criteria

- [ ] First-time visitors see professional theme (clean fonts, white/light BG, no neon, no glow effects)
- [ ] Navigation labels are formal in professional mode, RPG in RPG mode
- [ ] Pixel cat click switches to RPG mode with a brief transition animation
- [ ] CRT toggle only visible in RPG mode
- [ ] Theme preference persisted in localStorage (`site-theme`)
- [ ] Zero RPG visual regression when in RPG mode
- [ ] No RPG text appears in professional mode ("Quests", "Nya~!", "Site Reliability Mage", etc.)
- [ ] A way to switch back from RPG to professional mode exists
- [ ] Print styles continue to work
- [ ] All existing tests pass; new tests cover theme hook

## Notes

This is the **foundation feature** -- Issues #2 (AI Chat) and #3 (WebGPU Shaders) depend on the theme system this creates for their theme-aware UIs.
