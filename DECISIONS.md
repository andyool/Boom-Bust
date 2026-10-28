# Decisions

Changes to the rules or data beyond `SPEC.md`, with the reason. The app's "About the rules" screen lists these alongside SPEC section 10.

## Data (game-data.json)

**2026-10-27: structured card effects.** Card amounts only existed as prose in each card's `logic` text, so the engine would have had to retype them. `gen_data.py` now adds an `effect` field to every News, Life, Market, Policy and Starting Life card, plus three constants: `savingsBlock` (200), `superFundStep` (10) and `economyStart` (STEADY). The change is additive: every existing field is unchanged and `SPEC.md` regenerates byte-for-byte. `check_effects()` in `gen_data.py` fails the build if any dollar amount in an `effect` is missing from that card's `logic` text. (Confirmed by Andreas.)

## Rules confirmed by Andreas (2026-10-27)

1. **P13 at Level 3 is Budget only.** SPEC 7.3 applied both "Budget only" and "-$10", which made Food Shops free to land on. At Level 3, P13 forces the Budget clip and the -$10 does not also apply. At Level 2, P13 is -$10 (minimum $0).
2. **Savings interest is paid in cash.** The Bank pays it to the player, so Savings stay in $200 blocks.
3. **S01 "Family can help" is only used up when it saves something.** If the first enrolment is already free (Open Day space, P05 Free TAFE), S01 is kept for a later course. Order of free sources: Open Day, then P05, then S01, then the L15 card (offered as a choice).
4. **Halves round up to the next $10**, because the smallest note is $10. Selling to the Bank pays half of (price + Extra Sites paid), rounded up once (Lithium Mine $350 sells for $180). M12 half-price Extra Site and M14 half-price business also round up ($15 becomes $20, $175 becomes $180).
5. **A utility won in the P10 auction can be sold back to the Bank** for half its auction price (rounded up). It returns to government ownership, so its bill goes to Treasury again.

## Screens (changes to SPEC section 4)

**2026-10-27: no mini board.** Andreas: the iPad is a companion, not a second board. The main screen no longer draws the 40-tile ring or the board-centre dashboard, and tokens do not walk. Instead it shows:
- a status bar with the state the app calculates with: economy, Level 2 tracks, Treasury, Bonds, Public Projects, laws;
- the current player's turn: one big next-step button and the side actions;
- a card per player: job, papers, KEEP cards, and the businesses they own (tap one for its deed).

X01 board art appears only on the Home screen.

**2026-10-28: no dice entry; students report only what happens.** Andreas: typing in every roll was too many taps and double handling (roll, move, then tell the iPad the same thing). Students now roll and move on the real board and touch the iPad only when something happens. This replaces SPEC 5.3 (dice sheet, NEXT) and the "current player's turn" panel above:
- Each player card has two buttons: **LANDED** and **PAYDAY**. LANDED opens that player's sheet: the board's 40 spaces in order (one row per side, starting at its corner) and their side actions. They tap the space their piece is on, and the usual landing sheet opens (SPEC 5.4).
- Spaces with nothing to do are greyed out: JOB CENTRE, Level 1 PARLIAMENT and the player's own businesses. Tapping a space by mistake is undone by closing its sheet or tapping BACK before choosing.
- **PAYDAY** runs the whole Payday (SPEC 5.5) for that player. When it is DONE, their sheet opens so they can tap where they landed, and their PAYDAY is greyed out until something else happens.
- **Doubles** only matter when looking for work, so the button appears only on that player's sheet.
- There are no turns in the app, so anyone can report in any order, and nothing new starts while a landing or Payday is open. Side actions (Loan, Repay, Sell, Trade, Savings, Deal, Can't pay) act for the player whose sheet they came from.
- **Game end:** the app cannot see the round finish, so in the last round an **END GAME** button appears ("Back to [Start Player]?").

A typical turn went from about 6 taps (ROLL, two dice, GO, the landing choice, NEXT) to 3 for a landing that matters (LANDED, the space, the choice) and 0 for one that does not. The engine keeps the dice flow's `roll`, `moveTo` and `next` actions so saved games still replay; the UI now sends `land`, `payday` and `doubles`. The teacher menu no longer edits a token's space, because the app no longer uses it.

## Engine interpretations (small calls; flag any you disagree with)

- **Super Fund:** the Bank's $50 needs a job; anyone may add up to $100 of their own (rulebook page 3 puts these in separate sentences).
- **Trading a business** keeps its Extra Sites, resets its price clip to Standard and ends any Supply Deal it was in.
- **Bankruptcy:** Savings go back to the player's hand first (they then hand over all their cash). Utilities they owned return to government.
- **Level 3 shop-around ties:** if any of the cheapest businesses is the lander's own, they pay nothing. Otherwise, the landed tile's owner if they are among the cheapest; otherwise the only cheapest owner; otherwise the lander picks.
- **Spaces with nothing to do** (PAYDAY, JOB CENTRE, Level 1 PARLIAMENT, your own business) finish the landing automatically.
- **"Treasury pays X"** borrows Bonds payment by payment. This gives the same number of Bonds as borrowing for the total.
- **Zero lines are kept** in Payday itemising (for example "Gym $0", "Projects $0") so every step shows.
- **Budget night** (teacher menu) is Level 2 and up, because Policy cards are Level 2.
- **Game end:** setup offers 5 Paydays *or* a timer, so choosing a timer turns the Payday ending off. When the timer reaches 0 the app sets "last round", and the table taps END GAME when the round comes back to the Start Player.
- **Waiting for a job card after study** (`pendingUpgrade`) is implemented as specified, but cannot happen with 6 or fewer players: there are 6 cards per level and each player holds one card, so one is always free.
