# Boom & Bust Companion App: Build Spec

**What it is.** A web app that sits on one iPad in the middle of each table while students play the printed Boom & Bust board game. Students still roll real dice, move real pieces, draw real cards and hand over real paper money. The app does all the maths: it shows every amount itemised on screen and tells each player, the Banker and the Treasury exactly who pays whom.

**Who uses it.** Years 8 to 10, 3 to 6 players per table, one shared iPad per table. Many students have limited reading, so the app must use as few words as possible and lean on the game's own artwork.

**Where it lives.** A static site hosted on Vercel. It has no accounts, no server and no network sync between iPads. All state stays on the iPad.

**Files in this folder**
- `SPEC.md` (this file): what to build and how the rules work.
- `game-data.json`: every number in the game (spaces, businesses, jobs, tracks, cards, constants). Import it; do not retype the data.
- `gen_data.py` and `SPEC.template.md`: the source that generates the two files above. Only edit them if the game rules change, then run `python3 gen_data.py`.
- The artwork is in `../Proofed game assets/` (211 PNGs, named `ID-name.png`, for example `B03-bakery.png`). Treat that folder as read-only.
- The printed rulebook is `../Print files/08 Rulebook - A4.pdf`. If this spec and the rulebook disagree, follow this spec and flag it.

---

## 1. Principles

1. **The app calculates and the students handle the money.** The app never tracks players' cash. It tracks everything else that a calculation needs (jobs, businesses, loans, Super, Savings, Treasury, tracks, laws) and shows money instructions.
2. **Itemise everything.** Every result is shown as lines (icon, 1 to 3 words, amount), then a total, then a "settle up" box with at most a few arrows.
3. **Look like the board.** Use the real tiles, cards, tokens, notes and icons from the asset pack, the board's colours and fonts. The main screen is a small version of the board.
4. **Few words.** Labels are 1 to 3 words. Pictures replace sentences wherever possible. The cards' own text is on the card images, so the app does not repeat it.
5. **Big and touchable.** Built for an iPad lying flat on a table and passed around. Touch targets are at least 56 px. Text is at least 18 px; money amounts are big (32 px or more).
6. **Hard to break.** Autosave after every action, one-tap Undo, and a teacher menu to fix anything.

## 2. Tech and hosting

- **Stack:** Vite + React + TypeScript. Use plain CSS or CSS modules (no heavy UI kit). State lives in a reducer or Zustand store.
- **Rules engine:** pure TypeScript in `src/engine/`, with no React imports. UI calls the engine; the engine returns new state plus a list of money transfers to display. This is what gets unit-tested.
- **Event log:** the game state is `reduce(initialState, actions[])`. Every player input (dice values, card picked, buy/pass, yes/no answers) is an action. Nothing in the app is random, because dice and cards are physical. Undo means dropping the last action and replaying. Persist the action log to `localStorage` after every action; "Continue" on launch replays it.
- **Offline:** make it a PWA (`vite-plugin-pwa`) that can be added to the iPad Home Screen, runs full screen and works offline after the first load.
- **Fonts:** Poppins 700 for headings and numbers, Lato 400/700 for body, self-hosted via `@fontsource`.
- **Tests:** Vitest for the engine. The acceptance tests in section 11 are required.
- **Vercel:** the project root is `companion-app/`. Framework preset Vite, build `npm run build`, output `dist`. Initialise git **inside `companion-app/` only**, because the parent folder holds about 500 MB of artwork and print PDFs that must not be committed.

### Asset pipeline
Write `scripts/optimise-assets.mjs` (using `sharp`) and an `npm run assets` script that:
- reads every PNG in `../Proofed game assets/` and takes the ID from the file name up to the first `-` (`PP1-roads-bridges.png` becomes `PP1`; `MAT-print-6.png` becomes `MAT`);
- writes WebP files into `public/assets/sm/ID.webp` and `public/assets/lg/ID.webp`:

| Group | sm width | lg width |
| --- | --- | --- |
| Cards D, J, K, N, L, M, P, S, G (portrait 5:7) | 240 | 720 |
| Board tiles B, A (portrait 5:8) | 160 | 480 |
| Corners C, icons E, I, tokens T, tiles PP (square) | 160 | 480 |
| Notes Q (2:1) | 200 | 600 |
| X01 board centre | 800 | 1600 |
| X02 logo, MAT | 600 | 1200 |

- WebP quality 80. Precache `sm` plus X01 and X02 for offline use; cache `lg` at runtime on first view.
- Commit `public/assets/`, because Vercel cannot see the parent folder.

## 3. Assets

| IDs | What | Use in the app |
| --- | --- | --- |
| X01 | Board centre art | Faint background behind the dashboard |
| X02 | Logo | Home screen, top bar |
| C01-C04 | Corner tiles: Payday, Job Centre, Parliament, Job Cut | Board ring corners; Payday screen header (C01); Parliament screen (C03) |
| B01-B26 | Business and transport tiles (portrait 5:8) | Board ring spaces; buy screen |
| A01-A07 | Action tiles: Life, Market, Open Day, Tax Time, Super Fund, Power, Water | Board ring spaces |
| D01-D28 | Business cards (deeds) | Tap a business to see it; owned businesses in player panels |
| J01-J18 | Job cards | Player panels, job picker |
| K01-K08 | Card backs | Deck buttons; K07 = looking for work |
| N01-N24, L01-L20, M01-M16, P01-P16, S01-S06 | Action cards | Card pickers and result screens |
| G01-G05 | Loan, Bond, HECS, Bankrupt, Supply Deal | Counters in player panels and Treasury |
| PP1-PP5 | Public Project tiles | Treasury panel (built = full colour, not built = faded) |
| Q01-Q05 | Banknotes $10, $20, $50, $100, $500 | Note helper on every money instruction |
| T01-T06 | Player pieces | Player avatars and tokens on the board ring |
| E01-E05 | Economy states | Economy track |
| I01-I03 | Prices, Wages, Interest | Level 2 tracks |
| I04 | Treasury | Treasury panel and money arrows |
| I05 | Laws | Laws panel (Level 2) |
| I06 | Bank | Money arrows |
| I07 | Extra Site marker | Pips on owned businesses |
| I08 | Study token | Player panel while studying or bankrupt |
| I09 | Super | Player panel Super amount |
| MAT | Player mat | Visual reference for the Payday screen layout |

Card backs: News K01, Life K02, Market K03, Policy K04, Starting Life K05, Business K06, Job card "looking for work" side K07, Loan/Bond/HECS/Bankrupt/Supply Deal K08.

## 4. Visual design

**Colours** (sampled from the artwork):

| Token | Hex | Use |
| --- | --- | --- |
| navy | `#03284E` | text, outlines, board rim, buttons |
| teal | `#0E9C9D` | Treasury, primary actions, Level 2 |
| coral | `#F2634D` | money paid out, warnings |
| mustard | `#F7B928` | highlights, current player |
| cream | `#FAF2E0` | backgrounds, panels |
| green | `#1F9A6B` | money received, Bank papers |
| purple | `#7A42AA` | Level 3, Starting Life |

Industry colours are in `game-data.json` (`industries[].colour`).

**Look:** a cream background with a 6 px navy rim around the whole app, like the board's rim. Panels are cream with a 2 px navy outline and 12 px rounded corners. Images keep their navy outlines. Buttons are chunky and rounded, with Poppins labels in caps. Money received is shown as green `+$90`; money paid as coral `-$70`. Always show the sign as well as the colour.

**Main screen layout (iPad landscape, 1180 x 820 and up):**

```
+--------------------------------------------------+-------------------------+
|  MINI BOARD (square, full height)                |  PLAYERS                |
|  40 real tiles in a ring, anticlockwise          |  [T01] Mia   J02  $  ...|
|  from PAYDAY at bottom left.                     |  [T02] Ben   K07  ...   |
|  Tokens (T01-T06) on their spaces.               |  ...                    |
|  Owner badge (token) + site pips (I07) on tiles. |                         |
|                                                  |  CURRENT PLAYER         |
|   CENTRE DASHBOARD                               |  [  ROLL  ]  big button |
|   Economy track E01-E05 with marker              |  Loan  Repay  Sell      |
|   L2: Prices / Wages / Interest (I01-I03)        |  Trade  Savings  Deal   |
|   Treasury (I04): $  · Bonds (G02) · PP1-PP5     |  Can't pay              |
|   L2: Laws (up to 3 mini Policy cards)           |  Undo   Record          |
+--------------------------------------------------+-------------------------+
```

- Tiles in the ring are rotated like the real board: bottom row upright, right column rotated 90 degrees anticlockwise, top row 180 degrees, left column 90 degrees clockwise. Corners are squares 1.6 times a space's width. The exact layout is in `spaces[].side` and in section 9.
- Tapping a tile opens it large, with its deed (D card), owner, Extra Sites and (Level 3) price clip.
- The X01 artwork sits faintly (about 25% opacity) behind the centre dashboard.
- Portrait orientation can stack the players under the board; landscape is the priority.
- Flows open as full-screen sheets that are always upright, with big images and big buttons.

**Words.** Use these labels and keep any others just as short:
`ROLL`, `PAYDAY`, `BUY`, `PASS`, `AUCTION`, `PAY`, `GET`, `DONE`, `NEXT`, `UNDO`, `LOAN`, `REPAY`, `SELL`, `TRADE`, `SAVINGS`, `+ SITE`, `STUDY`, `TAFE`, `UNI`, `DEAL`, `CAN'T PAY`, `RECORD`, `END GAME`, `YES`, `NO`, `Wage`, `Tax`, `JobSeeker`, `Study`, `Profit`, `Projects`, `Living`, `Interest`, `HECS`, `Savings`, `Super`, `Laws`, `Total`, `Settle up`, `Bank`, `Treasury`, `Lost job`, `Got job`, `Yours`, `Shift pay`.

**Note helper.** Next to every amount a player pays or receives, show the fewest paper notes that make it, using the Q01-Q05 images ($500, $100, $50, $20, $10). For example $90 shows one $50 and two $20s. It can be switched off in the teacher menu.

## 5. Screens and flows

### 5.1 Home
X02 logo, `NEW GAME`, `CONTINUE` (if a saved game exists).

### 5.2 Setup (one screen, step by step)
1. **Level:** three big buttons `1`, `2`, `3` with their names (Starter, Money & Government, Competition & Fairness). Levels are cumulative: Level 3 includes all Level 2 rules.
2. **Players:** 3 to 6. For each player, pick a token (T01-T06), type a first name (optional; default to the token's name), and tap the Entry Job card they were dealt (J01-J06; each card used once).
3. **Level 3 only:** tap the Starting Life card each player drew (S01-S06; S06 can be used up to 3 times).
4. **End:** `5 Paydays` (default) or a timer in minutes.
5. **Banker screen:** "Treasury $200" with the I04 icon, and each player's starting cash with the note helper ($400, or the Starting Life amount). For S04, mark the Coffee Cart as owned.
6. Start: the first player listed is the Start Player.

### 5.3 A turn
1. Current player's token and name are highlighted. Big `ROLL` button.
2. **Dice sheet:** two rows of dice faces 1-6. Tap one value in each row, then `GO`. Doubles are detected automatically (no extra turn). If the player is looking for work and rolled doubles, show "Got job" first.
3. The token animates anticlockwise along the ring. If it passes or lands on PAYDAY, the Payday flow (5.5) runs there, then the move finishes. A small `Wrong space?` link lets them pick the actual tile.
4. **Landing sheet** (5.4) for the space.
5. After landing, the side actions stay available (Loan, Repay, Sell, Trade, Savings, Deal, Can't pay). `NEXT` ends the turn.

### 5.4 Landing sheet
Shows the tile large, then one of:
- **Unowned business:** the deed card, price, `BUY` / `PASS`. Level 2 and up: `PASS` offers `AUCTION` (pick the winning token and type the bid; minimum $10; winner pays the Bank).
- **Your own business:** "Yours".
- **Someone else's customer business:** who pays whom and why (Standard or Monopoly price; Level 3 shows the cheapest owner in the industry), with the note helper.
- **Factory or Mine owned by someone else:** "Shift pay": the owner pays the lander.
- **Transport owned by someone else:** the lander pays $20 for each transport business the owner has.
- **Power or Water:** $20 bill to Treasury, or to the owner if sold (Level 2 law P10).
- **Life or Market:** the card picker (5.6), then the card's result.
- **Tax Time:** company tax itemised per business.
- **Open Day:** `TAFE` / `UNI` / `NO` (only if eligible); no fee and no HECS card.
- **Super Fund:** if employed, "Bank puts $50 in your Super"; then the player may add their own $0 to $100 in $10 steps.
- **JOB CUT:** Job Risk check (5.7). If the job is lost, the token moves to JOB CENTRE without Payday.
- **PARLIAMENT:** Level 1 "Rest"; Level 2 and up, the Parliament flow (5.9).
- **JOB CENTRE / PAYDAY:** nothing more.

### 5.5 Payday
Laid out like the player mat (MAT, "MY PAYDAY"): seven numbered steps down the screen, each step filling in as it resolves.
1. **News:** "Draw a News card" with the K01 back. Picker shows all 24 News cards. After tapping one: the card large, the economy marker animating, any Level 2 chain reactions (each shown as a small step with its icon), job changes (Lost job / Got job, with tokens), and money for every affected player. Then `NEXT`.
2. **Income:** Wage (with "Bank to Treasury: Tax $X" shown for the Banker), or JobSeeker from Treasury, or Study allowance from Treasury (plus token removal and, if finished, the new job picker).
3. **Profit:** one line per business (tile thumbnail, sites x profit), Supply Deal lines (Level 3), and law lines (Level 2).
4. **Projects:** $10 x projects built.
5. **Living:** living costs, with the GST share going to Treasury when P11 is in force.
6. **Debts:** loan interest, HECS, Savings interest (Level 2), fortune tax (P14), Bankrupt token removed.
7. **Choices:** optional buttons `+ SITE`, `STUDY`, `LOAN`, `REPAY`, `SAVINGS` (L2), `PRICES` (L3 price clips), `DEALS` (L3 cancel), then `DONE`.

After step 6, show **Settle up**: the player's net with the Bank, net with Treasury, and Bank to Treasury (tax), as arrows between token, I06 and I04 images, each with the note helper. Example: `[Mia] <- Bank +$30` and `Bank -> Treasury $10`.

After `DONE`, run the **Treasury check** (section 7.9). If a project is built, show its PP tile big: "Treasury builds Roads & Bridges. Treasury pays the Bank $300."

### 5.6 Card picker
A grid of real card images for that deck (big thumbnails, 4 to 6 per row), headed by the deck back. Tap a card to see it large, then `YES`. Hide Life/Market KEEP cards that a player is currently holding, and Policy cards currently in force. Cards that need an answer (inputs in `game-data.json`) ask it with picture buttons (for example L09: "More than $300 cash?" `YES` / `NO`).

### 5.7 Job Risk check
Entry: lost straight away. Skilled: "Roll a die" with faces 1-6; 1 to 3 loses the job. Professional: 1 or 2 loses it. Players who are studying are skipped. If a player holds L12 Volunteer, offer `USE` to keep the job. When several players check at once (recession), show one row per worker.

### 5.8 Side actions (current player's turn)
- `LOAN`: shows the limit check; Bank gives $200; a G01 is added to the player.
- `REPAY`: the player gives the Bank $200; one G01 is removed.
- `SELL`: pick one of their businesses; the Bank pays half its price plus half of what was paid for its Extra Sites.
- `TRADE`: pick a business and its new owner; cash moves physically and the app just records the owner.
- `SAVINGS` (L2): put in or take out $200 blocks.
- `DEAL` (L3): pick two players and one business each from linked industries.
- `CAN'T PAY`: the bankruptcy flow (7.11).

### 5.9 Parliament (Level 2+)
Tap the proposed Policy card (picker hides laws in force). Two optional 30-second timers: `FOR` then `AGAINST`. Then `PASSED` / `FAILED` (a tie fails). If passed: add the law (P06 is one-off; P10 runs two auctions). If there would be 4 laws, the proposer taps one to remove.

### 5.10 Record
A table with one row per Payday (section 7.12) and line charts: Economy over Paydays and, at Level 2, Prices and Wages on one chart. `SHARE` exports CSV through the iPad share sheet (Web Share API with a file), with a CSV download as fallback.

### 5.11 End game
Triggered when the Start Player finishes their 5th Payday and the round completes, when the timer runs out and the round completes, or from the teacher menu. Each player enters their counted cash on a number pad. Show each player's net worth itemised, a podium, then a class-talk panel: gap between richest and poorest, players looking for work, projects built, Bonds owed, and a link to the Record charts.

### 5.12 Teacher menu
Opened by pressing and holding the logo for 2 seconds. It contains:
- Undo (several steps).
- Edit any value: economy, tracks, Treasury, Bonds, projects, owners, sites, player fields, position.
- Reserve Bank mode (Level 2): turns off the two automatic interest rows and lets the teacher set the rate.
- Budget night: apply a Policy card as a law at this table.
- ACCC fine (L3 cartel: chosen players pay $100 to Treasury).
- Note helper on or off.
- End game now, New game, Export record.

## 6. Game state (TypeScript sketch)

```ts
type Econ = 'RECESSION' | 'SLOW' | 'STEADY' | 'GROWTH' | 'BOOM';
type Rate = 'LOW' | 'NORMAL' | 'HIGH' | 'VERY HIGH';
type JobStatus = 'employed' | 'looking' | 'studying';

interface Player {
  id: string; name: string; token: string;          // T01-T06
  position: number;                                  // 0-39
  jobId: string;                                     // J01-J18 card held
  jobStatus: JobStatus;
  study?: { kind: 'tafe' | 'uni'; tokensLeft: number; target: 'skilled' | 'professional' };
  pendingUpgrade?: 'skilled' | 'professional';       // finished study, no card free yet
  loans: number; hecs: boolean; superBalance: number; savings: number;
  bankruptTokens: number;                            // 0-3
  keepCards: string[];                               // L12, L13, L15, L19
  startingLife?: string; freeCourseUsed: boolean;    // S01
  paydays: number;
}
interface Holding {
  businessId: string; ownerId: string | null;
  extraSites: 0 | 1 | 2; sitesPaid: number;         // total $ paid for its Extra Sites
  priceClip: 'budget' | 'standard' | 'premium' | 'monopoly';   // Level 3
  forcedStandardUntilPaydayOf?: string;               // M16 at Level 3
}
interface Game {
  level: 1 | 2 | 3;
  players: Player[]; startPlayerId: string; turnIndex: number;
  economy: Econ; prices: number; wages: number; interest: Rate;
  treasury: number; bonds: number; projectsBuilt: number;  // 0-5
  holdings: Record<string, Holding>;                  // every business incl. utilities
  laws: { id: string; passedAt: number }[];           // max 3
  supplyDeals: { a: string; aBiz: string; b: string; bBiz: string }[];
  flags: { noNewLoans: boolean; rbaMode: boolean; lastRound: boolean };
  record: RecordRow[]; settings: { noteHelper: boolean; endPaydays: number; timerEndsAt?: number };
}
interface Transfer {                                  // what the UI itemises
  from: 'bank' | 'treasury' | string;                // string = player id
  to: 'bank' | 'treasury' | string | `super:${string}` | `savings:${string}`;
  amount: number; label: string; icon: string;       // icon = asset ID
}
```

The app tracks the Treasury balance by applying every transfer to or from `treasury`. The teacher menu can correct it after counting the tray.

## 7. Rules engine

All numbers come from `game-data.json`. "Bank" means the Bank tray (employers, shops and lenders). "Treasury" means the government tray. Unless a card says Treasury, payments go to or come from the Bank.

### 7.1 Helpers
- `owned(p)`: every business with `ownerId = p`, including transport and sold utilities.
- `ownedIn(p, industries[])`: count of those businesses in the listed industries.
- `ownsAll(p, industry)`: p owns every business in that industry (utilities excluded).
- `employed(p)`: `jobStatus === 'employed'`. Studying and looking for work are not employed.
- **Treasury pays X:** if `treasury < X`, add Bonds until it can pay: each Bond is a $200 transfer Bank to Treasury labelled "Bond" (G02), with `bonds += 1`.
- **Latest law wins** when two laws conflict (P03 and P04; P07 and P08).

### 7.2 Movement
`newPos = (pos + d1 + d2) % 40`. If `pos + d1 + d2 >= 40`, run Payday before landing (passing or landing exactly on PAYDAY). JOB CUT sends the player straight to position 10 without Payday. If the player is looking for work and `d1 === d2`, they become employed before moving.

### 7.3 Landing on a business owned by someone else
- **Customer industries** (market_stalls, food_shops, trades, takeaway, fun_fitness, big_shops):
  - Levels 1-2: price = Monopoly if the owner `ownsAll` that industry, otherwise Standard.
  - Level 3: every owned business in that industry charges its clip price. Monopoly is only allowed if its owner `ownsAll`; a business with `forcedStandardUntilPaydayOf` charges Standard; with P13 in force, food_shops and the Supermarket can only charge Budget. The lander pays the **lowest** charge in the industry to the owner of that business. Ties: the owner of the landed tile if they are among the cheapest, otherwise the lander chooses. If the cheapest business is the lander's own, they pay nothing.
  - Level 2+: if Prices is 4 or higher, add $10. With P13 in force, subtract $10 for food_shops and the Supermarket (minimum $0).
- **Employers** (factories, mines): owner pays lander `shiftPay` ($20 Factory, $40 Mine), or `shiftPayIfOwnsAll` if the owner `ownsAll` that industry.
- **Transport:** lander pays owner $20 x the number of transport businesses the owner has.
- **Utilities:** government-owned means $20 to Treasury; player-owned (after P10) means $20 to the owner; your own means nothing.

### 7.4 Spaces
- **Tax Time:** pay Treasury `rate x owned(p).length`. Rate $20; P03 makes it $30; P04 makes it $10.
- **Open Day:** may enrol in TAFE or Uni now, if eligible, with no fee and no HECS card.
- **Super Fund:** if employed, Bank to `super:p` $50; then optional $0-$100 (steps of $10) from p to `super:p`.
- **Life / Market:** resolve the picked card (section 9).
- **JOB CUT:** Job Risk check if employed; lost means move to position 10 (no Payday).
- **PARLIAMENT:** Level 2+ Parliament flow.

### 7.5 Jobs
- **Job Risk check** happens on JOB CUT, when the economy moves into RECESSION (every employed worker), and on N20/N21 (named jobs only, no roll). Entry always loses; Skilled loses on a die roll of 1-3; Professional on 1-2. If lost: `jobStatus = 'looking'` (the card is kept, face down). If the player holds L12, offer to use it instead: job kept, L12 returns to the deck.
- **Getting a job back** (status becomes employed with the same card): rolling doubles while looking; the economy moving **up** into GROWTH or BOOM (everyone looking); N22 (Skilled and Professional players who are looking).
- **Job pool:** the 18 job cards. A card is free if no player holds it. Entry cards not dealt at setup stay free.

### 7.6 Study
- **TAFE:** allowed if the player holds an Entry card (employed or looking), or is looking for work. Fee $50 to Treasury. S03 makes it $100. It is free on the Open Day space, with P05, by handing in L15, or as the first course for S01. Sets `study = { kind: 'tafe', tokensLeft: 1, target: 'skilled' }`, `jobStatus = 'studying'`.
- **Uni:** allowed with an Entry or Skilled card, or when looking for work. Take a HECS card (`hecs = true`) unless on the Open Day space or the first course for S01. `tokensLeft: 2`, target professional.
- At each Payday while studying: Treasury pays $30 (Study allowance), `tokensLeft -= 1`. At 0: the player picks a free job card of the target level, their old card becomes free, and they are employed. If no card is free, they go back to employed in their old job with `pendingUpgrade` set; at each later Payday, offer the swap as soon as a card is free.
- No Job Risk checks while studying.

### 7.7 News card and chain reactions
Run this at step 1 of every Payday.
1. Clear `noNewLoans`.
2. `arrow = card.economy`. Level 2+ only: if interest is HIGH or VERY HIGH and `arrow > 0`, then `arrow -= 1`; if interest is LOW and `arrow < 0`, then `arrow += 1`.
3. `old = economy; economy = clamp(old + arrow)` (RECESSION to BOOM).
4. Apply the card's own effects (section 9 `logic`).
5. Economy job effects (all levels): if `economy === RECESSION && old !== RECESSION`, run a Job Risk check for every employed worker. If `economy > old` and economy is GROWTH or BOOM, everyone looking for work becomes employed.
6. Level 2+ track effects, in this order. Clamp each track; "went up" means the value actually rose:
   - card `level2.prices` raises Prices by 1 (note `pricesUp`); card `level2.wages` raises Wages by 1;
   - if `economy === BOOM` (after the card, even if it was already BOOM): Prices up 1 (note `pricesUp`);
   - unless `rbaMode`: if `pricesUp`, Interest up 1; if `economy < old` and economy is SLOW or RECESSION, Interest down 1;
   - if `economy > old` and `economy === GROWTH`: Wages up 1.
7. Add a Record row (7.12).

### 7.8 Payday for player p
Clear any M16 `forcedStandardUntilPaydayOf === p` at the start. Then:
1. **News** (7.7).
2. **Income:**
   - Employed: `takeHome = jobLevels[level].takeHome + (L2+: wages x 10) + (P01 and Entry: 20) + (P02: 10) - (S05: 20)`; `tax = jobLevels[level].tax - (P02: 10)` (minimum 0). Bank to p `takeHome`; Bank to Treasury `tax`.
   - Looking: Treasury to p, JobSeeker $50 (P07: $70, P08: $30).
   - Studying: Treasury to p $30, then the study step (7.6).
   - Before income, if `pendingUpgrade` and a card is free, offer the swap.
3. **Profit:** for each owned business, `profit[economy] x (1 + extraSites)`, Bank to p (or p to Bank if negative). Sold utilities make $20. Level 3: +$20 from the Bank for each Supply Deal p is in. Level 2+ laws: P01 p pays Bank $10 x owned; P09 p pays Treasury $20 x (factories + mines owned, excluding the Solar Panel Factory) and Treasury pays p $20 if they own the Solar Panel Factory; P12 Bank pays p $20 x factories owned; P16 p pays Bank $10 x factories owned.
4. **Projects:** Bank to p `$10 x projectsBuilt`.
5. **Living:** base $70 at Level 1, or `livingCosts[prices]` at Level 2+. Then -$10 if p holds L13, +$10 with P12, -$10 with P16 (minimum 0); this goes to the Bank. With P11, add $10 to Treasury.
6. **Debts:** loan interest `loans x rate` to the Bank (rate $20 at Level 1, otherwise the Interest track); HECS $20 to Treasury if `hecs`. Level 2+: Savings interest `floor(savings / 200) x savingsInterestPer200[interest]` from the Bank. P14: ask whether cash plus Savings is over $1,000; yes means $50 to Treasury. If `bankruptTokens > 0`, subtract 1.
7. **Choices** (optional): Extra Sites (cost to the Bank, max 2 per business, not transport or utilities); study enrolment; loan or repay; Level 2+ Savings; Level 3 price clips and cancelling Supply Deals.
8. `paydays += 1`. Then run the Treasury check (7.9). If p is the Start Player and `paydays === endPaydays`, set `lastRound`.

### 7.9 Treasury check (after every Payday)
1. Level 2+, and only if p is the Start Player: Treasury pays the Bank `$10 x bonds` (borrowing if short).
2. Level 2+: while `bonds > 0 && treasury >= 400`: Treasury repays $200 to the Bank and `bonds -= 1`.
3. If `treasury >= 400 && projectsBuilt < 5`: Treasury pays the Bank $300 and `projectsBuilt += 1`. Build at most one project per check.

At Level 1, Bonds are never repaid; they are only counted.

### 7.10 Loans
Borrowing is allowed if `!noNewLoans && bankruptTokens === 0 && loans < owned(p).length + (employed(p) ? 1 : 0)`. Bank to p $200. Repaying: p to Bank $200.

### 7.11 Can't pay and bankruptcy
The `CAN'T PAY` sheet lists ways to raise cash: sell a business to the Bank, take out Savings, or borrow if allowed. Then `PAID` or `STILL CAN'T`. If still can't: the player hands over all their cash; all their businesses become unowned (sites 0, clip Standard, Supply Deals ended); `loans = 0`; `savings = 0`; `bankruptTokens = 3`. They keep their job, Super, HECS and KEEP cards and carry on playing.

### 7.12 Record row (after every News card)
`{ payday#, player, newsCard, economy, prices, wages, interest, outOfWork (players looking), treasury, bonds, projectsBuilt }`. Prices, Wages and Interest are blank at Level 1.

### 7.13 Net worth (end of game)
`cash (entered) + savings + 2 x super + sum over owned businesses of (price + sitesPaid) x multiplier - 200 x loans - (hecs ? 100 : 0)`. The multiplier is 0.5 in RECESSION, 1.5 in BOOM, otherwise 1. Utilities sold by P10 count at the price paid at auction (store it as `price` on the holding).

### 7.14 Level 3 extras
- **Price clips:** set at the owner's Payday (step 7) for each customer business: budget, standard, premium, or monopoly (only if they `ownsAll`). New businesses start on Standard.
- **Supply Deals:** a player can be in at most 2; there are at most 6 at once. Their businesses must be in linked industries (`linkedIndustries`; `transport` links with any). Either player may cancel at their own Payday. A deal ends if either business is sold or lost.
- **Cartel:** the teacher menu's ACCC fine (each chosen player pays $100 to Treasury).
- **Starting Life:** sets start cash and the effects listed in section 9.

### 7.15 Parliament and laws (Level 2+)
Passed laws are added with `passedAt`. With 4 laws, the proposer removes one. Removing a law ends its effects, except that utilities stay sold. P06 is one-off (build now, borrowing if short) and is not stored. P10 auctions the Power Company then the Water Company (minimum bid $100; the winner pays Treasury; no bid means it stays government-owned).

## 8. Money instructions

Every engine call returns `Transfer[]`. The UI shows them in two ways:
1. **Itemised lines**, grouped by step: icon, 1-3 word label, signed amount.
2. **Settle up**, netted per pair: player and Bank, player and Treasury, Bank and Treasury, player and player, player and Super, player and Savings. One arrow per pair. Show the note helper for amounts that players hand over or receive.

## 9. Game data

All of this is in `game-data.json`. The tables below are generated from the same source.

### Board spaces (anticlockwise from PAYDAY at bottom left)
| Pos | Tile | Space | Kind | Side |
| --- | --- | --- | --- | --- |
| 0 | C01 | PAYDAY | payday | corner |
| 1 | B01 | Coffee Cart | business | bottom |
| 2 | A01 | Life card | life | bottom |
| 3 | B02 | Fruit & Veg Stall | business | bottom |
| 4 | A04 | Tax Time | tax_time | bottom |
| 5 | B23 | Trucking Company | business | bottom |
| 6 | B03 | Bakery | business | bottom |
| 7 | A03 | TAFE & Uni Open Day | open_day | bottom |
| 8 | B04 | Butcher | business | bottom |
| 9 | B05 | Corner Deli | business | bottom |
| 10 | C02 | JOB CENTRE | job_centre | corner |
| 11 | B06 | Car Mechanic | business | right |
| 12 | A06 | Power Company | utility | right |
| 13 | B07 | Plumber | business | right |
| 14 | B08 | Electrician | business | right |
| 15 | B24 | Freight Railway | business | right |
| 16 | B09 | Pizza Place | business | right |
| 17 | A01 | Life card | life | right |
| 18 | B10 | Burger Bar | business | right |
| 19 | B11 | Sushi Bar | business | right |
| 20 | C03 | PARLIAMENT | parliament | corner |
| 21 | B12 | Gym | business | top |
| 22 | A02 | Market card | market | top |
| 23 | B13 | Cinema | business | top |
| 24 | B14 | Trampoline Park | business | top |
| 25 | B25 | Fremantle Port | business | top |
| 26 | B15 | Clothing Store | business | top |
| 27 | B16 | Electronics Store | business | top |
| 28 | A07 | Water Company | utility | top |
| 29 | B17 | Supermarket | business | top |
| 30 | C04 | JOB CUT | job_cut | corner |
| 31 | B18 | Furniture Factory | business | left |
| 32 | B19 | Boat Builder | business | left |
| 33 | A01 | Life card | life | left |
| 34 | B20 | Solar Panel Factory | business | left |
| 35 | B26 | Perth Airport | business | left |
| 36 | A02 | Market card | market | left |
| 37 | B21 | Lithium Mine | business | left |
| 38 | A05 | Super Fund | super_fund | left |
| 39 | B22 | Iron Ore Mine | business | left |

### Businesses
Landing shows the customer prices (Budget / Standard / Premium / Monopoly) or the special rule. Profit is per site, in order RECESSION / SLOW / STEADY / GROWTH / BOOM.

| Tile | Deed | Business | Industry | Buy | Landing (Budget / Standard / Premium / Monopoly) | Profit R / SL / ST / G / B | Extra Site |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B01 | D01 | Coffee Cart | Market Stalls | $60 | $10 / $20 / $30 / $40 | $0 / $10 / $10 / $20 / $30 | $30 |
| B02 | D02 | Fruit & Veg Stall | Market Stalls | $60 | $10 / $20 / $30 / $40 | $0 / $10 / $10 / $20 / $30 | $30 |
| B03 | D03 | Bakery | Food Shops | $100 | $10 / $20 / $30 / $40 | $10 / $20 / $20 / $20 / $30 | $50 |
| B04 | D04 | Butcher | Food Shops | $100 | $10 / $20 / $30 / $40 | $10 / $20 / $20 / $20 / $30 | $50 |
| B05 | D05 | Corner Deli | Food Shops | $120 | $10 / $20 / $30 / $40 | $10 / $20 / $20 / $20 / $30 | $50 |
| B06 | D06 | Car Mechanic | Trades | $140 | $20 / $30 / $40 / $60 | $0 / $10 / $20 / $30 / $40 | $70 |
| B07 | D07 | Plumber | Trades | $140 | $20 / $30 / $40 / $60 | $0 / $10 / $20 / $30 / $40 | $70 |
| B08 | D08 | Electrician | Trades | $160 | $20 / $30 / $40 / $60 | $0 / $10 / $20 / $30 / $40 | $70 |
| B09 | D09 | Pizza Place | Takeaway | $180 | $20 / $30 / $40 / $60 | $10 / $20 / $30 / $30 / $40 | $90 |
| B10 | D10 | Burger Bar | Takeaway | $180 | $20 / $30 / $40 / $60 | $10 / $20 / $30 / $30 / $40 | $90 |
| B11 | D11 | Sushi Bar | Takeaway | $200 | $20 / $30 / $40 / $60 | $10 / $20 / $30 / $30 / $40 | $90 |
| B12 | D12 | Gym | Fun & Fitness | $220 | $20 / $40 / $50 / $80 | -$20 / $0 / $30 / $50 / $70 | $110 |
| B13 | D13 | Cinema | Fun & Fitness | $220 | $20 / $40 / $50 / $80 | -$20 / $0 / $30 / $50 / $70 | $110 |
| B14 | D14 | Trampoline Park | Fun & Fitness | $240 | $20 / $40 / $50 / $80 | -$20 / $0 / $30 / $50 / $70 | $110 |
| B15 | D15 | Clothing Store | Big Shops | $260 | $30 / $40 / $60 / $80 | -$10 / $20 / $40 / $50 / $60 | $130 |
| B16 | D16 | Electronics Store | Big Shops | $260 | $30 / $40 / $60 / $80 | -$10 / $20 / $40 / $50 / $60 | $130 |
| B17 | D17 | Supermarket | Big Shops | $280 | $30 / $40 / $60 / $80 | $40 / $40 / $40 / $40 / $50 | $140 |
| B18 | D18 | Furniture Factory | Factories | $300 | owner pays lander $20 ($10 if owns all) | -$30 / $10 / $50 / $70 / $90 | $150 |
| B19 | D19 | Boat Builder | Factories | $300 | owner pays lander $20 ($10 if owns all) | -$30 / $10 / $50 / $70 / $90 | $150 |
| B20 | D20 | Solar Panel Factory | Factories | $320 | owner pays lander $20 ($10 if owns all) | -$30 / $10 / $50 / $70 / $90 | $150 |
| B21 | D21 | Lithium Mine | Mines | $350 | owner pays lander $40 ($20 if owns all) | -$50 / $0 / $60 / $100 / $150 | $180 |
| B22 | D22 | Iron Ore Mine | Mines | $400 | owner pays lander $40 ($20 if owns all) | -$40 / $20 / $70 / $110 / $160 | $200 |
| B23 | D23 | Trucking Company | Transport | $200 | lander pays owner $20 x transport owned | $0 / $10 / $20 / $30 / $40 | none |
| B24 | D24 | Freight Railway | Transport | $200 | lander pays owner $20 x transport owned | $0 / $10 / $20 / $30 / $40 | none |
| B25 | D25 | Fremantle Port | Transport | $200 | lander pays owner $20 x transport owned | $0 / $10 / $20 / $30 / $40 | none |
| B26 | D26 | Perth Airport | Transport | $200 | lander pays owner $20 x transport owned | $0 / $10 / $20 / $30 / $40 | none |
| A06 | D27 | Power Company | Utilities | not for sale | $20 bill (Treasury, or owner if sold) | $20 / $20 / $20 / $20 / $20 | none |
| A07 | D28 | Water Company | Utilities | not for sale | $20 bill (Treasury, or owner if sold) | $20 / $20 / $20 / $20 / $20 | none |

### Jobs
Entry: pay $100, tax $10, take-home $90, always lost on a Job Risk check. Skilled: $160 / $30 / $130, lost on 1-3. Professional: $220 / $50 / $170, lost on 1-2.

| Card | Job | Level |
| --- | --- | --- |
| J01 | Retail Assistant | entry |
| J02 | Kitchen Hand | entry |
| J03 | Cashier | entry |
| J04 | Delivery Driver | entry |
| J05 | Farm Hand | entry |
| J06 | Cleaner | entry |
| J07 | Chef | skilled |
| J08 | Hairdresser | skilled |
| J09 | Childcare Educator | skilled |
| J10 | Carpenter | skilled |
| J11 | Welder | skilled |
| J12 | Aged Care Worker | skilled |
| J13 | Nurse | professional |
| J14 | Engineer | professional |
| J15 | Teacher | professional |
| J16 | Accountant | professional |
| J17 | Software Developer | professional |
| J18 | Geologist | professional |

### Level 2 tracks
- Prices 1-6 (start 2): living costs $60 / $70 / $80 / $90 / $100 / $120. From 4 up, customer prices +$10.
- Wages 0-5 (start 0): take-home +$0 to +$50.
- Interest LOW / NORMAL / HIGH / VERY HIGH (start NORMAL): loans $10 / $20 / $30 / $40 each; Savings earn $0 / $10 / $20 / $30 per $200.

### Economy News cards (24)
| ID | Title | Economy | Level 2 | Logic |
| --- | --- | --- | --- | --- |
| N01 | Iron ore sales to Asia soar | +1 |  | Owner of iron_ore_mine collects $50 from Bank. |
| N02 | Shoppers are spending again | +1 |  | No money moves. |
| N03 | New suburbs planned: builders flat out | +1 |  | Each player collects $20 x (trades businesses they own) from Bank. |
| N04 | Tourists flock back to WA | +1 |  | Each player collects $20 x (fun_fitness businesses they own) from Bank. |
| N05 | Lithium rush for electric car batteries | +1 |  | Owner of lithium_mine collects $50 from Bank. |
| N06 | Government spends big on roads and rail | +1 |  | Treasury builds the next unbuilt Public Project now ($300 to Bank), borrowing Bonds if short. Nothing extra if all 5 are built. |
| N07 | Record wheat harvest | +1 |  | Each player collects $20 x (food_shops businesses they own: Bakery, Butcher, Corner Deli; not the Supermarket) from Bank. |
| N08 | Businesses confident: new shops opening | +1 |  | No money moves. |
| N09 | Overseas orders dry up | -1 |  | Each player pays $20 x (factories they own) to Bank. |
| N10 | Shoppers tighten their belts | -1 |  | No money moves. |
| N11 | Banking crisis overseas | -2 |  | Set flag noNewLoans = true. Clear it when the next News card is resolved. |
| N12 | Pandemic: shops shut for a month | -2 |  | Treasury pays $50 to every player, borrowing Bonds if short. |
| N13 | Trade war: new taxes on our exports | -1 |  | Each player pays $30 x (mines they own) to Bank. |
| N14 | Share market crash | -1 |  | Each player's Super falls by min($50, their Super). That money goes from their Super pile to the Bank. |
| N15 | Quiet quarter: no big news | 0 |  | Nothing happens. |
| N16 | Experts say steady as she goes | 0 |  | Nothing happens. |
| N17 | Oil price shock | 0 | prices +1 | Each player pays $20 x (transport businesses they own) to Bank. |
| N18 | Drought pushes up food prices | 0 | prices +1 | Each player pays $20 x (takeaway businesses they own) to Bank. |
| N19 | Minimum wage goes up | 0 | wages +1 | Each player pays $10 x (all businesses they own, including transport and sold utilities) to Bank. |
| N20 | Self-checkouts everywhere | 0 |  | Players holding J03 Cashier or J01 Retail Assistant who are employed become looking for work (Volunteer card L12 may be handed in). |
| N21 | Robots in warehouses and kitchens | 0 |  | Players holding J04 Delivery Driver or J02 Kitchen Hand who are employed become looking for work (L12 may be handed in). |
| N22 | Tech boom: skilled workers wanted | 0 |  | First: every employed Skilled or Professional worker collects $30 from Bank. Then: every Skilled or Professional player looking for work becomes employed (they do not get the $30). |
| N23 | Australian dollar falls | 0 | prices +1 | Each player collects $20 x (mines + factories they own) from Bank. |
| N24 | Bushfire emergency | 0 |  | Treasury pays $100 to Bank (borrow if short). Each player pays $20 x (market_stalls + fun_fitness businesses they own) to Bank. |

### Life cards (20)
| ID | Title | Logic |
| --- | --- | --- |
| L01 | Car breaks down | Drawer pays $60 to Bank. |
| L02 | Cracked phone screen | Drawer pays $40 to Bank. |
| L03 | It's your birthday | Every other player pays the drawer $10. |
| L04 | Sold your old bike online | Drawer collects $30 from Bank. |
| L05 | Tax refund | Drawer collects $40 from Treasury (borrow if short). |
| L06 | Sick for a week | If drawer is employed in an Entry job: pays $50 to Bank. Otherwise nothing. |
| L07 | Promotion at work | If drawer is employed: collects $50 from Bank. |
| L08 | Speeding fine | Drawer pays $100 to Treasury. |
| L09 | Scam text message | Ask the drawer: more than $300 cash? Yes: pays $100 to Bank. Savings are safe. |
| L10 | Buy now, pay later trap | Drawer pays $60 to Bank. |
| L11 | Cheaper phone plan | Drawer collects $20 from Bank. |
| L12 | Volunteer at the community garden (KEEP) | Drawer keeps it. The next time they would lose their job (any cause), offer to hand it in: job kept, card returns to the deck. |
| L13 | Move into a share house (KEEP) | Drawer keeps it for the rest of the game: living costs -$10 at every Payday. |
| L14 | Rent goes up | Drawer pays $40 to Bank. |
| L15 | Free online course (KEEP) | Drawer keeps it. When they enrol in TAFE, offer to hand it in: no fee. Card returns to the deck. |
| L16 | Dentist visit | Drawer pays $80 to Bank. |
| L17 | Side hustle | Drawer collects $40 from Bank. |
| L18 | Broken arm | Drawer pays $20 to Bank. |
| L19 | Insurance offer (KEEP) | Ask: buy insurance? Yes: drawer pays $30 to Bank and keeps the card. It cancels the next L20 Car Crash or M13 Fire payment, then returns to the deck. |
| L20 | Car crash | Drawer pays $150 to Bank unless they hold L19: then hand it in and pay nothing. |

### Market cards (16)
| ID | Title | Logic |
| --- | --- | --- |
| M01 | Video goes viral | Each player collects $30 x (takeaway they own) from Bank. |
| M02 | Health inspector visit | Each player pays $20 x (takeaway they own) to Treasury. |
| M03 | Equipment breaks down | Drawer pays $20 x (all businesses they own) to Bank. |
| M04 | Suppliers raise prices | Each player pays $20 x (food_shops + takeaway they own) to Bank. |
| M05 | Big chain store opens nearby | Each player pays $20 x (market_stalls + food_shops they own) to Bank. |
| M06 | Online shopping takes off | Each player pays $30 x (clothing_store + electronics_store they own) to Bank. Each player collects $20 x (transport they own) from Bank. |
| M07 | Workplace safety fine | Each player pays $40 x (factories + mines they own) to Treasury. Law P15 in force: $20 instead. |
| M08 | Pollution clean-up | Each player pays $30 x (factories + mines they own) to Treasury. Law P15 in force: $15 instead. |
| M09 | Small business grant | If drawer owns at least one market_stalls or food_shops business: collects $50 once from Treasury (borrow if short). |
| M10 | Staff shortage | Each player pays $10 x (all businesses they own) to Bank. |
| M11 | Big overseas order | Each player collects $40 x (factories they own) from Bank. |
| M12 | Business course | Optional: drawer picks one of their businesses with fewer than 2 Extra Sites (not transport or utilities) and adds a site for half its Extra Site cost, paid to Bank. |
| M13 | Fire! | If drawer owns any business: pays $100 to Bank unless they hold L19 (hand it in, pay nothing). |
| M14 | Bargain for sale | Optional: drawer picks any unowned business (not utilities) and buys it for half its price, paid to Bank. |
| M15 | Supply deal | Drawer picks another player who owns at least one business. Both collect $30 from Bank. If nobody else owns a business, nothing happens. |
| M16 | ACCC investigation | For each player and each industry (not utilities) where they own every business: pay $100 to Treasury. Level 3: those businesses are forced to Standard price until that owner's next Payday. |

### Policy cards (16, Level 2+)
| ID | Title | Logic |
| --- | --- | --- |
| P01 | Raise the minimum wage | Law. Employed Entry workers: take-home +$20 (from Bank). At each player's Payday: pay $10 x (all businesses they own) to Bank. |
| P02 | Cut income tax | Law. Employed workers: take-home +$10 and tax -$10 (Bank pays the same total). |
| P03 | Raise company tax | Law. Tax Time is $30 per business. |
| P04 | Cut company tax | Law. Tax Time is $10 per business. |
| P05 | Free TAFE | Law. TAFE fee is $0. |
| P06 | Build it now | One-off if passed: Treasury builds the next Public Project now (borrow if short). Not kept as a law. |
| P07 | Raise JobSeeker | Law. JobSeeker is $70. |
| P08 | Cut JobSeeker | Law. JobSeeker is $30. |
| P09 | Carbon price | Law. At each player's Payday: pay $20 x (factories + mines they own, excluding solar_factory) to Treasury; if they own solar_factory, collect $20 from Treasury. |
| P10 | Sell the utilities | Law. Immediately auction power_company then water_company (min bid $100, winner pays Treasury; no bid = stays government). Owned utilities: lander pays owner $20; owner gets $20 profit at every Payday. Stay sold if the law is removed. |
| P11 | Raise GST | Law. Living costs +$10 at every Payday; that $10 goes to Treasury, the rest to Bank. |
| P12 | Tax on imports | Law. At each player's Payday: collect $20 x (factories they own) from Bank. Living costs +$10 (to Bank). |
| P13 | Cap food prices | Law. Food Shops and Supermarket customer prices -$10 (min $0). Level 3: these businesses can only charge Budget. |
| P14 | Tax on big fortunes | Law. At each player's Payday ask: cash + Savings over $1,000? (app knows Savings, ask about cash) Yes: pay $50 to Treasury. |
| P15 | Cut red tape | Law. M07 and M08 cost half. |
| P16 | Free trade deal | Law. Living costs -$10. At each player's Payday: pay $10 x (factories they own) to Bank. |

### Starting Life cards (Level 3; the deck is S01-S05 plus 3 x S06)
| ID | Title | Logic |
| --- | --- | --- |
| S01 | Family can help | Start cash $700. Their first TAFE or Uni enrolment has no fee and no HECS card. |
| S02 | Moved out at 17 | Start cash $200. |
| S03 | Grew up in a country town | Start cash $400. Their TAFE fee is $100 (unless TAFE is free for them). |
| S04 | Family business | Start cash $300 and they own coffee_cart. |
| S05 | Young carer | Start cash $300. Take-home pay -$20 at every Payday while employed. |
| S06 | Average start | Start cash $400. The physical deck has 3 copies of this card. |

## 10. Rules decisions

The printed rules do not settle these points, so the app does the following. Keep them consistent and list them on an "About the rules" screen in the teacher menu.
1. "Per business" counts Business cards owned (not Extra Sites), and includes transport and sold utilities unless a card names specific industries.
2. Food Shops means Bakery, Butcher and Corner Deli. The Supermarket is a Big Shop, except where P13 names it.
3. The TAFE fee goes to Treasury.
4. N14 takes up to $50 from Super (all of it if the player has less).
5. N22 pays $30 to employed Skilled and Professional workers first, then re-employs those looking.
6. L06 applies only to employed Entry workers.
7. M16 charges $100 for each complete industry a player owns (all industries except utilities).
8. P09's Solar Panel Factory payment comes from Treasury. P10 auction money goes to Treasury.
9. Level 3: if the cheapest business in an industry is the lander's own, they pay nothing.
10. Treasury repays Bonds only at Level 2+, before building a project.
11. Auctions are Level 2+ (as in the printed rulebook).
12. Levels are cumulative: Level 3 includes all Level 2 rules.

## 11. Acceptance tests (engine, Vitest)

1. **Worked example, Level 1.** Mia: Kitchen Hand (Entry, employed), owns Bakery and Gym (no sites), 1 loan, 1 project built, economy SLOW. Payday lines: Wage +$90 (Bank to Treasury tax $10), Bakery +$20, Gym $0, Projects +$10, Living -$70, Interest -$20. Net **+$30** from the Bank; Treasury +$10.
2. **Same in RECESSION, looking for work.** JobSeeker +$50 (Treasury), Bakery +$10, Gym -$20, Projects +$10, Living -$70, Interest -$20. Net **-$40**. Settle up: Treasury pays Mia $50; Mia pays the Bank $90.
3. **Monopoly price.** Ben owns Pizza, Burger and Sushi. Mia lands on Burger Bar at Level 1: pays Ben **$60**. At Level 2 with Prices at 4: **$70**.
4. **Employer.** Ben owns all 3 Factories; Mia lands on Boat Builder: Ben pays Mia **$10**. If Ben owns only Boat Builder: **$20**.
5. **Transport.** Ben owns 3 transport businesses; Mia lands on one: pays **$60**.
6. **Rates soften a boom (L2).** Interest HIGH, economy STEADY, N02 (+1): the arrow becomes 0, the economy stays STEADY and nothing else moves.
7. **Into BOOM (L2).** Economy GROWTH, Interest NORMAL, Prices 2, N01: economy BOOM; the Iron Ore owner +$50; Prices 3 (boom); Interest HIGH (prices went up); Wages unchanged; everyone looking gets their job back.
8. **Into RECESSION (L2).** Economy SLOW, Interest LOW, N11 (-2): the arrow becomes -1, economy RECESSION, Job Risk checks for every employed worker, Interest stays LOW (clamped), `noNewLoans = true`.
9. **Treasury build.** Treasury $395 before Mia's Payday; Mia's wage tax $10 makes it $405; the check builds PP1; Treasury is **$105**.
10. **Treasury borrowing.** Treasury $30, 4 players, N12: one Bond is added (+$200), Treasury pays $200, Treasury is **$30**, `bonds = 1`.
11. **Net worth.** Cash $500, Super $100, owns Bakery with 1 site ($50 paid), economy BOOM, 1 loan, HECS: 500 + 200 + 225 - 200 - 100 = **$625**.
12. **Shop around (L3).** Takeaway: Ana owns Pizza on Premium ($40), Ben owns Burger on Budget ($20). Mia lands on Pizza Place: pays **Ben $20**.
13. **TAFE.** Entry worker enrols at Payday step 7 and pays $50 to Treasury. At the next Payday: Study +$30 from Treasury, token gone, picks a Skilled card, and the old Entry card becomes free. At the following Payday: Wage +$130.
14. **Undo.** Any sequence of actions followed by Undo equals the state before the last action.

## 12. Not in version 1
- Syncing between iPads, or a teacher dashboard for the whole class.
- A "work it out first" mode where students calculate before the app reveals the answer (a good later addition).
- Sound and voice-over (keep the hooks easy to add).

## 13. Build order
1. Scaffold, asset pipeline, `game-data.json` import, rules engine and acceptance tests (no UI yet).
2. Setup flow and the main screen (mini board ring, dashboard, player panels).
3. Turns: dice, movement, landing sheets, buying, the card picker with all Life and Market cards.
4. Payday (all 7 steps), settle up, Treasury check, Record.
5. Level 2 (tracks, chain reactions, Savings, Parliament, laws, auctions) and Level 3 (price clips, shopping around, Supply Deals, Starting Life, cartel fine).
6. End game, Record charts and export, teacher menu, PWA offline, iPad polish, Vercel deploy.

Check each stage on an iPad-sized viewport (1180 x 820, landscape) before moving on.
