# Ten Thousand Lifetimes

An idle/incremental cultivation game for mobile. Gather qi, break through realm after realm, pass on and reincarnate stronger, and climb toward godhood.

**Play the latest build:** https://dlswimmer.github.io/Ten-Thousand-Lifetimes/ (deployed by GitHub Actions on every push to `main`).

## Prototype v0.1

- Qi cultivation with 9 minor stages per realm and 5 realms (Body Tempering to Nascent Soul)
- Chance-based breakthroughs; failures always grant Insight, which raises the next attempt's odds
- Lifespan that grows with each realm. When it runs out you pass peacefully and get the same Karma as a voluntary reincarnation, so there is never a penalty. Offline seclusion does not age you.
- Six cultivation arts with levels, milestones and mastery; a spiritual root rolled each life
- Karma tree with 11 nodes, including automation (auto-advance, auto-breakthrough)
- Auto-battle beast hunts for spirit stones (retreat costs nothing)
- Elixirs for breakthrough chance and extra years
- Offline progress (8 hours, more with Karma), autosave, export and import

## Development

```bash
npm install
npm run dev      # play at http://localhost:5173
npm run build    # production build in dist/
npm run lint
npm run sim -- 3 # headless balance simulation for 3 in-game hours
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
