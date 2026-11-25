# Ten Thousand Lifetimes

An idle/incremental cultivation game for mobile. Gather qi, break through realm after realm, pass on and reincarnate stronger, and climb toward godhood.

**Play the latest build:** https://dlswimmer.github.io/Ten-Thousand-Lifetimes/ (deployed by GitHub Actions on every push to `main`).

## Prototype v0.1

- One activity at a time: meditate, do chores, hunt or train the body. Qi only flows while meditating, until the late Karma upgrade Unceasing Circulation
- Tabs open as you progress (Sect on joining, Hunt at stage 3, Elixirs at Qi Gathering); Karma and reincarnation stay hidden until 80% of your first lifespan
- You start as a mortal. An elder from the sect that best suits your spiritual root finds you and brings you in (the Fated Meeting Karma upgrade lets you choose)
- Three sects (Azure Cloud Sect, Crimson Furnace Valley, Stoneheart Monastery), each with its own bonus and a library of six manuals
- Sect chores earn contribution, which buys manuals from the Scripture Pavilion; higher manuals need a higher sect rank
- Chores lean on a stat (vitality, speed, defense, attack or cultivation stage). Basic chores just run slower below it (down to 0.4x); better chores (gate, scriptures, caravan, instructing) have a hard requirement and stay locked until you meet it. Well above the requirement any chore runs up to 2x faster
- Body cultivation: a second path (Copper Skin, Iron Bone, Jade Marrow, Golden Blood, Diamond Body) fed by vigor from training, physical chores and hunts. It raises physical stats and is capped by your qi realm
- Stats (attack, defense, vitality, speed) grow with your realm and your equipped manuals' elements, and are compared with each beast on hunts
- Qi cultivation with 9 minor stages per realm and 5 qi realms (Qi Sensing to Nascent Soul). The first life is short on progress; Karma makes later lives faster
- Chance-based breakthroughs; failures always grant Insight, which raises the next attempt's odds
- Lifespan that grows with each realm. When it runs out you pass peacefully and get the same Karma as a voluntary reincarnation, so there is never a penalty
- Manuals with levels, milestones and mastery; a spiritual root rolled each life
- Karma tree with 13 nodes, including automation (auto-advance, auto-breakthrough)
- Auto-battle beast hunts for spirit stones and some contribution (retreat costs nothing)
- Elixirs for breakthrough chance and extra years
- Time away is banked as seclusion (8 hours, more with Karma). When you return the game asks whether to use it now, part of it, or save it for later; seclusion ages you as play does, and the preview shows what you would gain and whether your life would end. Autosave, export and import

## Development

```bash
npm install
npm run dev      # play at http://localhost:5173
npm run build    # production build in dist/
npm run lint
npm run sim -- 3 # headless balance simulation for 3 in-game hours
npm run sim:styles -- 8 7  # compare play styles (tapper, idle, hunter, elixirs...) over 8h, 7 seeds
```

All tunable numbers (costs, rates, realms, techniques, Karma nodes) live in `src/game/data.ts`. Game rules live in `src/game/engine.ts`, which has no UI code so the simulator can run it directly.

## Mobile builds (Capacitor)

The web build is wrapped for iOS and Android with Capacitor. Platform projects are not committed yet. To add them:

```bash
npm install @capacitor/android @capacitor/ios
npx cap add android   # needs Android Studio
npx cap add ios       # needs macOS with Xcode
npm run cap:sync
```
