# Pacing playtest: Ten Thousand Lifetimes v0.1

Simulated with `npm run sim:styles` (new `sim/playstyles.ts`), which plays the real engine headlessly. Each style ran 8 hours of wall clock (idle ran 72h) over 7 random seeds; numbers are medians. Raw output sits next to this file (`sim-before-*.txt`, `sim-after-*.txt`).

## Play styles

| Style | What it does |
|---|---|
| Steady | Always online, never taps. Chores when a manual is in reach, trains body when it lags, hunts 1/6 of the time, meditates otherwise |
| Active tapper | Same, plus 4 taps a second on whatever button is active |
| Hunt-focused | Hunts 60% of the time when a ground is safe |
| Elixir-focused | Buys 3 breakthrough pills before every attempt and longevity pills when affordable |
| Idle / offline-heavy | 5-minute check-ins five times a day, 3h gaps, 8h sleep. Never taps |
| Casual | 20 minutes every 2 hours while awake, light tapping, buys elixirs |

All styles reincarnate voluntarily only after the Karma tab is open, when stuck for 4 minutes and the life's Karma is at least half of all Karma earned so far.

## Before the fixes (main)

| Style | Qi Gathering | Foundation | Golden Core | Nascent Soul | Life 1 Karma | Content finished (NS 9) |
|---|---|---|---|---|---|---|
| Steady | 3m | 21m | 47m | 1.5h | 13 | ~2.3h |
| Active tapper | 2m | 6m | 22m | 45m | 79 | ~1.1h |
| Hunt-focused | 5m | 24m | 57m | 2.0h | 7 | |
| Elixir-focused | 3m | 21m | 45m | 1.6h | 13 | |
| Idle | 3m | 3.1h | 6.2h | 20.5h | 1053 | ~20h |
| Casual | 2m | 13m | 2.0h | 4.0h | 24 | |

## What I found

1. **Tapping was mandatory.** A Circulate tap was worth a full second of qi, so 4 taps a second made qi 5x faster. The tapper got 6x the first-life Karma and finished the whole prototype in about an hour, twice as fast as a steady player. That is the kind of pressure David wants to avoid.
2. **Hunting was a trap.** A safe ground paid only 1.3x to 2.3x passive stones while giving up all qi, and the payout fell behind as you climbed stages. Hunt-focused players were the slowest at every realm and earned half the Karma of steady players in life 1.
3. **The Karma snowball was steep.** Karma grows 1.22x per stage, and Echoes is cheap, so lives 3 to 5 jumped a whole realm each and active players hit the Nascent Soul 9 seal within 1 to 2 hours. After that every life gives the same 6,307 Karma with nothing new to reach.
4. **The first life is small for active players (good).** Steady life 1 lasts about 8 minutes and ends around Qi Gathering 5 or 6 with roughly 10 Karma, which buys Flowing Stages and a couple of Echoes levels. That matches "first reincarnation yields very little".
5. **Idle players break the "small first life" rule.** Seclusion never ages you, so an idle player's first life stretches over many check-ins (12 hours of wall clock, 21 minutes of actual play) and reaches Golden Core 9. Their first reincarnation paid 1,053 Karma, 80x a steady player's. In wall-clock terms idle is still about 10x slower than playing actively, so it is not overpowered overall, just lopsided on life 1.
6. **Elixirs barely matter.** Buying every pill changed realm timings by under 10%, because breakthrough odds are already high from Insight and pills compete with manuals for stones.
7. **Losing never costs progress in hunts (good).** Retreats only cost an 8-second rest; hunt-focused runs retreated 10 to 25 times with no lasting effect. Failed breakthroughs still lose 50% of stored qi and can trigger a heart demon, which is the one place a failure takes something away.

## Fixes in the PR

- **Tap worth 0.12s of qi instead of 1s** (still at least 1 qi, so it matters at the very start). Heavy tapping is now about +50% qi, not +400%. The floating number on the orb now shows the real tap gain.
- **Hunt rewards x3, and they grow with your stage inside the ground's realm** (same 1.12x per stage as passive stones, capped at that realm's peak). The Hunt tab shows the new per-kill reward.
- **Karma growth 1.22 → 1.18 per stage.** Lives step forward more gently, and the late Karma nodes (Unceasing Circulation at 1,500) are still reachable within a few hours.

## After the fixes

| Style | Qi Gathering | Foundation | Golden Core | Nascent Soul | Life 1 Karma | Content finished (NS 9) |
|---|---|---|---|---|---|---|
| Steady | 3m | 16m | 39m | 1.3h | 10 | ~2.6h |
| Active tapper | 3m | 8m | 27m | 56m | 32 | ~1.9h |
| Hunt-focused | 4m | 24m | 56m | 2.0h | 10 | over 3h |
| Elixir-focused | 3m | 16m | 38m | 1.5h | 10 | ~2.5h |
| Idle | 3m | 3.1h | 6.2h | 20.4h | 327 | ~23h |
| Casual | 3m | 14m | 2.0h | 4.0h | 14 | ~6.3h |

Tapping now helps (about 1.4x faster to the seal) without being required. Hunt-focused players earn the same first-life Karma as steady ones, though they are still about 1.5x slower to Nascent Soul because hunting gives up all qi. Idle life 1 dropped from 1,053 to 327 Karma.

## Suggestions not in the PR

- **Idle first life.** Options: cap or soften the first life's Karma (for example 15 plus the square root of anything above it), let seclusion age you slowly but never end a life while you are away, or leave it. My recommendation is the soft cap: it keeps "no aging offline" and makes life 1 small for everyone.
- **Give hunting its own reward.** Once blacksmithing lands, beasts should drop materials that only hunting provides. Stones alone can't make it a real path, since qi is what climbs realms.
- **Content runway.** Even after the fixes, an active player finishes all five realms in 2 to 3 hours. Ascension and the next realms are the main thing that will stretch the game; until then, the Nascent Soul seal is the wall.
- **Softer failed breakthroughs.** Losing 25% of qi instead of 50% would fit "never punished" better, and Insight already makes repeated attempts feel like progress.
- **Elixirs.** They will matter once alchemy exists. Until then, a cheaper or stronger longevity pill (+25 years) would make them a choice.
