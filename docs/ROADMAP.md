# Roadmap to version 2.0

We work through this list in order. Each step is done when its check passes. Each phase has its own branch, and nothing merges into `main` until every phase is finished.

Baseline to return to at any time: tag `v1.0-baseline`, and `backups/demo-bank-lovable-v1.0-baseline.zip`.

## Phase 5: Quality (branch `feat/quality`)

- [x] 1. Automated tests for round-ups, transfers, investing, cards, new accounts, top-ups, fees, and crypto (37 tests passing).
- [x] 2. Move the passcode rule out of the sign-up screen into the rules folder, and test it.
  - Check: `npm test` passes, and sign-up still rejects a weak passcode.
- [x] 3. Test saving and loading the app's data (bad or missing data falls back to the demo).
  - Check: `npm test` passes.
- [x] 4. Contrast check on the cards and the coloured screens (text must be readable on each).
  - Check: every text and background pair reaches at least WCAG AA (4.5:1 for body text).
- [ ] 5. Keyboard and screen-reader check of the main flows: sign-in, sending money, moving money, ordering a card.
  - Check: each flow can be finished with the keyboard alone.

## Phase 3: Design system and themes (branch `feat/design-system`)

- [ ] 6. Move colours, type, spacing, and radii into named design tokens.
  - Check: the app looks the same as before.
- [ ] 7. Add a second theme, and a theme switch in Settings.
  - Check: switching themes restyles the whole app, cards included.

## Phase 4: Sound, haptics, illustrations (branch `feat/feel`)

- [ ] 8. A consistent sound set in place of the generated tones, with a switch to turn it off.
- [ ] 9. Light haptic feedback on phones that support it: payment success, a frozen card, an error.
- [ ] 10. Illustrations for empty states, onboarding, and the "Get your card now" banner.

## Phase 1: Motion (branch `feat/motion`), finish

- [ ] 11. Check the account swipe with touch on a real phone.

## Screen redesigns (branch `feat/screens`)

- [ ] 12. Payments.
- [ ] 13. Budgets.
- [ ] 14. Activity.
- [ ] 15. Crypto and Invest.
- [ ] 16. Profile sub-windows (Accounts, Theme, Settings, and the rest).

## Phase 6: Phone app (branch `feat/mobile`)

- [ ] 17. Package the app for phones with Capacitor, and check it runs on a real phone.

## Finish

- [ ] 18. Merge every branch into `main` in the order above, test the result, and tag `v2.0`.
