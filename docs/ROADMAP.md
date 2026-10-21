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
- [x] 5. Keyboard and screen-reader check of the main flows: sign-in, sending money, moving money, ordering a card.
  - Check: each flow can be finished with the keyboard alone.
  - Found and fixed: sheets did not move focus into themselves, Tab could leave them, Escape did not close the Move money window, and focus was not returned to the button that opened them. A shared dialog helper (`src/components/bank/useDialog.ts`) now handles all four.
  - Checked: every button and field on the eight main pages has an accessible name.

## Phase 3: Design system and themes (branch `feat/design-system`)

- [x] 6. Move colours, type, spacing, and radii into named design tokens.
  - Check: the app looks the same as before.
  - Done: radii, glass settings, type sizes, control spacing, and motion timings are in `src/styles/tokens.css`. The palette was already in `styles.css`.
  - Still literal: the card colours in `CardFace.tsx` (they move with the themes in step 7), and the glass blur (see note below).
  - Found: the glass blur was missing from the built CSS. The standard `backdrop-filter` line was being dropped next to its `-webkit-` copy, so the glass panels had no blur. It now shows, so the panels look more blurred than before.
- [x] 7. Add a second theme, and a theme switch in Settings.
  - Check: switching themes restyles the whole app, cards included.
  - Done: the app already had five palettes (Profile > Theme). Now the same choice is also in Settings > Theme, and each palette sets the full-screen colour of every section. Black metal keeps the original section colours. Account pages keep their own account colour, on every palette.
  - Left for later (the cards, as agreed): the card colours do not change with the palette.

## Phase 4: Sound, haptics, illustrations (branch `feat/feel`)

- [x] 8. A consistent sound set in place of the generated tones, with a switch to turn it off.
  - Done: all five sounds now come from one scale, use one voice, one level and one note spacing, and their shapes match their meaning (rising for good news, falling for a problem, repeated notes for a stop). The Sounds switch in Settings still turns them off. Tests check the family (7 tests).
  - Not done: recorded sound files. The sounds are still made in the browser, so they are simple tones, not a sound designer's recordings.
- [x] 9. Light haptic feedback on phones that support it: payment success, a frozen card, an error.
  - Done: a short vibration for a successful payment or money in, a firmer double pulse for a refused or blocked payment, and one pulse when a card is frozen. A Haptics switch in Settings turns it off, separately from Sounds. Tests check the patterns (82 tests in total).
  - Not checked on a real phone yet. Desktop browsers do not vibrate, so please try it on your phone.
- [x] 10. Illustrations for empty states, onboarding, and the "Get your card now" banner.
  - Done: one line-drawing style (`src/components/bank/Illustrations.tsx`): a receipt for no transactions, a chat for no messages, a pie chart for no budgets, a coin for no crypto, and a card on the "Get your card now" banner. They are hidden from screen readers, because the text beside them says what is happening. Pip already serves as the onboarding character.
  - Not checked: the empty states themselves, since the test profile always has some activity. Each one is worth a look on a new account.

## Phase 1: Motion (branch `feat/motion`), finish

- [ ] 11. Check the account swipe with touch on a real phone.
  - Done in the browser: a touch-style drag (touch pointer events, phone-sized emulation) moved the account pager to the next account.
  - Still to do on your phone: the checklist below.
    1. Swipe the account pages left and right with one finger. Each swipe should move one page.
    2. A slow drag should settle on the nearest page. A fast flick should go one page.
    3. Scroll the page up and down on the account card. The page should still scroll vertically.
    4. Tap "Move money" and "See more" after a swipe. They should open, not be lost to the swipe.
    5. Tap a dot at the bottom of the pager. The pages should move to that account.

## Screen redesigns (branch `feat/screens`)

- [x] 12. Payments.
  - Done: chat bubbles (your messages on the accent colour, theirs on a plain surface, each with its tail toward its sender), a rounded message box with a rounded send button, and the chat illustration on the "Choose a contact" screen. Checked: a message sends and shows in the new style, with no errors.
  - Not changed: the contact list layout and the Pay and Request panels. Those are next if you want more.
- [x] 13. Budgets.
  - Done: a donut chart, "Where your money went", at the top of the screen. Each slice is a spending category, biggest first, with a centre total and a legend showing each category's share and whether it is in or over its budget. Transfers between your own accounts are left out, since they are not spending. The biggest six categories get a slice; the rest are grouped as "Other". The old bar chart at the bottom is replaced by this.
  - Tested: the rules for the slices (8 tests in total for this, 88 tests overall), and the chart in the preview with three categories.
- [x] 14. Activity.
  - Done: a summary card (net, money in, money out), type filters as pills, search and category in rounded fields, transactions grouped by day, and the receipt illustration when there is no activity at all. Checked in the preview: the summary is right, and the "Money in" pill narrows the list. The transaction details and the search still work as before.
- [ ] 15. Crypto and Invest.
- [ ] 16. Profile sub-windows (Accounts, Theme, Settings, and the rest).

## Phase 6: Phone app (branch `feat/mobile`)

- [ ] 17. Package the app for phones with Capacitor, and check it runs on a real phone.

## Finish

- [ ] 18. Merge every branch into `main` in the order above, test the result, and tag `v2.0`.
