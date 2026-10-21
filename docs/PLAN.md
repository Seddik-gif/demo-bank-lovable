# Demo Bank: next steps plan

## Safety net (done)

- **Baseline tag:** `v1.0-baseline` on GitHub, at commit `c5248b9`. To look at or restore this version:
  ```bash
  git checkout v1.0-baseline
  ```
- **Backup zip:** `backups/demo-bank-lovable-v1.0-baseline.zip` (outside the repo, next to the project folder).

## How we work from now on

1. Every phase starts on its own branch, named `feat/<phase-name>`. `main` only gets finished, tested work.
2. Before merging a phase, run `npx tsc -p tsconfig.json --noEmit` and check the phone preview by hand.
3. Each finished phase gets a tag, such as `v1.1-motion`, so any point can be restored.
4. If a phase makes things worse, go back to the previous tag. Nothing is deleted.

## Phases

### Phase 1: Motion (`feat/motion`)
- Add Framer Motion.
- Account pager: spring physics for swiping, and the page scale and fade follow the finger.
- Sheets (Move money, Profile, Open account): slide up with a spring.
- Shared-element transition: tapping a card on Home grows it into the Cards page.
- Card flip: a physical spring instead of a timed rotation.
- **Done when:** swiping and sheets feel smooth on the phone preview, and the reduced-motion setting still turns animation off.

### Phase 2: Real 3D cards (`feat/card-3d`)
- Build the card in three.js (React Three Fiber) so it bends and catches light as you move.
- Add glass refraction and the holographic shimmer from the reference.
- Keep a CSS fallback for devices without WebGL.
- **Done when:** the card matches the reference look, runs at a steady frame rate on a phone, and falls back cleanly.

### Phase 3: Design system and themes (`feat/design-system`)
- Move colours, type, spacing, and radii into named design tokens.
- Add theme packs (for example, the current palette and one more). A theme changes cards, backgrounds, buttons, and sounds together.
- Document the components in one place.
- **Done when:** changing one token changes the whole app, and two themes can be switched in Settings.

### Phase 4: Sound, haptics, illustrations (`feat/feel`)
- Replace the generated tones with a short, consistent sound set.
- Add light haptic feedback on supported phones (for example, on payment success or a frozen card).
- Add illustrations for empty states, onboarding, and the "Get your card now" banner.
- **Done when:** each key action has one matching sound and one matching illustration, and sound can be turned off.

### Phase 5: Quality and accessibility (`feat/quality`)
- Add automated tests for the money rules: round-ups, transfers, trades, card delivery, and sign-up.
- Check text contrast on the translucent cards and the coloured screens.
- Check that every control works with the keyboard and a screen reader.
- **Done when:** the tests pass and the contrast checks pass on every screen.

### Phase 6: Phone app (`feat/mobile`)
- Package the app for phones with Capacitor, so it can use real haptics, biometrics, and the camera.
- **Done when:** the app runs on a real phone from a build, and the demo data behaves the same as in the browser.

## Open decisions

- Savings interest: still an estimate only.
- Cards: not yet tied to accounts. Each card should belong to one account.
- Physical card delivery: still simulated with a button.
- Which phase comes first. The recommendation is Phase 1, then Phase 5 (the tests), before the bigger visual work in Phase 2.
