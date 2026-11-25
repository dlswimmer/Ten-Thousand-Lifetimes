// Play-style balance harness. Simulates several kinds of players against the real engine and
// reports wall-clock time to each realm and each reincarnation, averaged over seeds.
// Run: npx tsx sim/playstyles.ts [wallHours=24] [seeds=5]
import * as E from '../src/game/engine';
import { CHORES, HUNT_GROUNDS, KARMA_NODES, REALMS, TECHNIQUES, clarityPillCost, longevityPillCost, MAX_LONGEVITY_PILLS } from '../src/game/data';

const WALL_HOURS = Number(process.argv[2] ?? 24);
const SEEDS = Number(process.argv[3] ?? 5);
const ONLY = process.env.STYLE;

// ---------- deterministic randomness ----------
function seedRandom(seed: number) {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- play styles ----------
interface Style {
  name: string;
  taps: number; // taps per second on whatever the current activity's button is
  hunt: number; // share of active time spent hunting when a ground is safe
  elixirs: boolean; // buys breakthrough pills before every attempt and longevity pills when affordable
  /** Online/offline pattern. null = always online. */
  sessions: null | { online: number; offline: number };
  /** Sessions per day before a long sleep gap (only used with sessions). */
  dailySessions?: number;
}

const STYLES: Style[] = [
  { name: 'steady (no taps)', taps: 0, hunt: 1 / 6, elixirs: false, sessions: null },
  { name: 'active tapper', taps: 4, hunt: 1 / 6, elixirs: false, sessions: null },
  { name: 'hunt-focused', taps: 0, hunt: 0.6, elixirs: false, sessions: null },
  { name: 'elixir-focused', taps: 0, hunt: 1 / 6, elixirs: true, sessions: null },
  // Checks in 5 times a day for 5 minutes, then sleeps 8h. Never taps.
  { name: 'idle / offline-heavy', taps: 0, hunt: 1 / 6, elixirs: false, sessions: { online: 300, offline: 3 * 3600 }, dailySessions: 5 },
  // Plays 20 minutes every 2 hours while awake, then sleeps.
  { name: 'casual (20m / 2h)', taps: 1, hunt: 1 / 6, elixirs: true, sessions: { online: 1200, offline: 6000 }, dailySessions: 7 },
];

const KARMA_PRIORITY = ['autoadvance', 'echoes', 'vein', 'longevity', 'autobreak', 'daoheart', 'memories', 'headstart', 'thirdeye', 'fated', 'seclusion', 'unceasing'];

interface Run {
  realmAt: Map<number, number>; // realm -> wall seconds first reached
  lives: { endWall: number; activeAtEnd: number; realm: number; stage: number; karma: number; voluntary: boolean; ageSec: number }[];
  hours: number;
  activeSec: number;
  offlineSec: number;
  huntLosses: number;
  final: string;
}

function play(style: Style, seed: number): Run {
  seedRandom(seed);
  const s = E.newGame(0);
  E.joinSect(s, s.fatedSect);
  let wall = 0;
  let active = 0;
  let offline = 0;
  let lastProgress = 0;
  let lastG = 0;
  let lifeStartActive = 0;
  let huntLosses = 0;
  const run: Run = { realmAt: new Map([[0, 0]]), lives: [], hours: 0, activeSec: 0, offlineSec: 0, huntLosses: 0, final: '' };
  const end = WALL_HOURS * 3600;

  const pickHunt = () => {
    let best: number | null = null;
    HUNT_GROUNDS.forEach((g, i) => {
      if (g.unlockRealm > s.realm) return;
      const m = E.matchup(s, i);
      if (m.killTime < m.surviveTime * 0.8) best = i;
    });
    if (best === null) return false;
    if (s.hunt.ground !== best) E.setHunt(s, best);
    return true;
  };

  const pickChore = () => {
    const open = CHORES.map((_, i) => i).filter((i) => E.canDoChore(s, i));
    const best = CHORES[open.reduce((a, b) => (E.choreRate(s, b) > E.choreRate(s, a) ? b : a))];
    if (s.chore.id !== best.id || s.activity !== 'chores') E.setChore(s, best.id);
  };

  const allocate = () => {
    const wantManual = TECHNIQUES.some((t, i) => t.sect === s.sect && !s.techs[i].owned && t.unlockRealm <= s.realm);
    const bodyBehind = s.body.level < Math.min(E.bodyCap(s), E.globalStage(s)) && !E.canTemper(s);
    const slot = Math.floor(active / 20) % 12; // 4-minute cycle of 20s slots
    const huntSlots = Math.round(style.hunt * 12);
    if (wantManual && slot < 2) { pickChore(); return; }
    if (bodyBehind && slot >= 2 && slot < 4) { E.setActivity(s, 'train'); return; }
    if (slot >= 12 - huntSlots && pickHunt()) return;
    E.setActivity(s, 'meditate');
  };

  const shop = () => {
    TECHNIQUES.forEach((_, i) => { if (E.canObtainManual(s, i)) E.obtainManual(s, i); });
    const owned = TECHNIQUES.map((_, i) => i).filter((i) => s.techs[i].owned);
    owned.sort((a, b) => E.techQps(s, b) - E.techQps(s, a));
    const want = owned.slice(0, E.slots(s));
    for (const i of want) if (!s.equipped.includes(i)) E.toggleEquip(s, i);
    if (style.elixirs) {
      if (E.atBottleneck(s)) while (E.buyClarity(s));
      if (s.longevityUsed < MAX_LONGEVITY_PILLS && s.stones > longevityPillCost(s.realm, s.longevityUsed) * E.elixirMult(s) * 1.5) E.buyLongevity(s);
    }
    for (let guard = 0; guard < 300; guard++) {
      let best = -1, bestVal = 0;
      TECHNIQUES.forEach((tech, i) => {
        if (!s.techs[i].owned || !want.includes(i)) return;
        const cost = E.techCost(s, i);
        if (cost > s.stones) return;
        const lvl = s.techs[i].lvl;
        const gain = lvl === 0 ? tech.baseQps * 3 : E.techQps(s, i) / lvl;
        const val = gain / cost;
        if (val > bestVal) { bestVal = val; best = i; }
      });
      if (best < 0) break;
      E.buyTech(s, best);
    }
    if (!style.elixirs && E.atBottleneck(s) && s.stones > clarityPillCost(s.realm) * 2) E.buyClarity(s);
  };

  const rebirth = () => {
    const p = s.passing!;
    run.lives.push({ endWall: wall, activeAtEnd: active, realm: p.realm, stage: p.stage, karma: p.karma, voluntary: p.voluntary, ageSec: active - lifeStartActive });
    E.beginNextLife(s);
    E.joinSect(s, s.fatedSect);
    lifeStartActive = active;
    lastProgress = wall; lastG = 0;
    for (let guard = 0; guard < 200; guard++) {
      const id = KARMA_PRIORITY.find((p) => {
        const n = KARMA_NODES.find((x) => x.id === p)!;
        return k(p) < n.maxLevel && (!n.requires || k(n.requires) > 0) && E.karmaCost(s, p) <= s.karma;
      });
      if (!id) break;
      E.buyKarma(s, id);
    }
  };
  const k = (id: string) => s.karmaUp[id] ?? 0;

  const markRealm = () => {
    if (!run.realmAt.has(s.realm)) run.realmAt.set(s.realm, wall);
    const g = E.globalStage(s);
    if (g > lastG) {
      lastG = g; lastProgress = wall;
      if (process.env.PROBE && s.lives === 1) {
        let best = '';
        HUNT_GROUNDS.forEach((gr, i) => {
          if (gr.unlockRealm > s.realm) return;
          const m = E.matchup(s, i);
          const rate = E.huntReward(s, i) / (m.killTime + 2);
          best += ` ${gr.id}:${m.verdict[0]} ${(rate / E.stonesPerSec(s)).toFixed(2)}x`;
        });
        console.log(`g=${g} ${REALMS[s.realm].name} ${s.stage} passive=${E.stonesPerSec(s).toFixed(1)}/s qps=${E.qps(s).toExponential(1)} body=${s.body.level} hunt(vs passive):${best}`);
      }
    }
  };

  const manual = () => {
    // what a player does by hand at a glance: advance stages, temper, break through when odds are decent
    while (E.canAdvance(s) && !E.atBottleneck(s)) E.advance(s);
    while (E.canTemper(s)) E.temperBody(s);
    if (E.atBottleneck(s) && E.canAdvance(s) && !E.sealedAtTop(s) && E.breakChance(s) >= 0.5) E.attemptBreakthrough(s);
  };

  const onlineSecond = () => {
    const hpBefore = s.hunt.recover;
    for (let sub = 0; sub < 2; sub++) E.tick(s, 0.5);
    if (s.hunt.recover > 0 && hpBefore === 0) huntLosses++;
    for (let t = 0; t < style.taps; t++) {
      if (s.activity === 'meditate') E.circulate(s);
      else if (s.activity === 'chores') E.workHard(s);
      else if (s.activity === 'hunt') E.strike(s);
      else if (s.activity === 'train') E.trainBody(s);
    }
    wall += 1; active += 1;
    manual();
    if (active % 5 === 0) { shop(); allocate(); }
    markRealm();
    // reincarnate when stuck 4 minutes of play and the karma is worth it
    const stuck = style.sessions ? active - lastActiveProgress > 240 : wall - lastProgress > 240;
    if (!s.passing && E.canReincarnate(s) && s.unlocked.includes('karma') && stuck && E.karmaForLife(s) >= Math.max(3, s.karmaEarned * 0.5)) E.endLife(s, true);
    if (s.passing) rebirth();
  };
  let lastActiveProgress = 0;

  let sessionIdx = 0;
  while (wall < end) {
    if (!style.sessions) { onlineSecond(); continue; }
    const g0 = E.globalStage(s);
    for (let t = 0; t < style.sessions.online && wall < end; t++) {
      const g = E.globalStage(s);
      onlineSecond();
      if (E.globalStage(s) > g) lastActiveProgress = active;
    }
    if (E.globalStage(s) > g0) lastActiveProgress = active;
    // leave the game meditating, the obvious thing to do before closing it
    E.setActivity(s, 'meditate');
    sessionIdx++;
    const daily = style.dailySessions ?? 3;
    const gap = sessionIdx % daily === 0 ? 8 * 3600 : style.sessions.offline;
    s.lastSeen = wall * 1000;
    const gBefore = E.globalStage(s);
    E.applyOffline(s, (wall + gap) * 1000);
    wall += gap; offline += gap;
    if (E.globalStage(s) > gBefore) lastActiveProgress = active;
    // on return, catch up by hand
    manual(); shop(); markRealm();
    if (s.passing) rebirth();
  }
  run.hours = wall / 3600;
  run.activeSec = active;
  run.offlineSec = offline;
  run.huntLosses = huntLosses;
  run.final = `life ${s.lives}, ${REALMS[s.realm].name} ${s.stage}, karma earned ${s.karmaEarned}`;
  return run;
}

// ---------- report ----------
const h = (sec: number | undefined) => sec === undefined ? '   -   ' : sec < 3600 ? `${(sec / 60).toFixed(0).padStart(4)}m  ` : `${(sec / 3600).toFixed(1).padStart(5)}h `;
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };

for (const style of STYLES) {
  if (ONLY && !style.name.includes(ONLY)) continue;
  const runs = Array.from({ length: SEEDS }, (_, i) => play(style, 1000 + i));
  console.log(`\n=== ${style.name} (${WALL_HOURS}h wall clock, ${SEEDS} seeds, medians) ===`);
  const realmLine = REALMS.map((r, i) => {
    const xs = runs.map((x) => x.realmAt.get(i)).filter((x): x is number => x !== undefined);
    return `${r.name}: ${xs.length < runs.length ? `${xs.length}/${runs.length} reach, ` : ''}${xs.length ? h(median(xs)).trim() : '-'}`;
  });
  console.log('  first reach  ' + realmLine.slice(1).join(' | '));
  const maxLives = Math.min(8, Math.max(...runs.map((r) => r.lives.length)));
  for (let L = 0; L < maxLives; L++) {
    const ls = runs.map((r) => r.lives[L]).filter(Boolean);
    if (!ls.length) break;
    const ends = median(ls.map((l) => l.endWall));
    const len = median(ls.map((l) => l.ageSec));
    const karma = median(ls.map((l) => l.karma));
    const realm = median(ls.map((l) => l.realm * 9 + l.stage - 1));
    const vol = ls.filter((l) => l.voluntary).length;
    console.log(`  life ${L + 1}: ends at ${h(ends)} wall, ${h(len)}of play, peak ${REALMS[Math.floor(realm / 9)].name} ${realm % 9 + 1}, +${karma} karma, chosen ${vol}/${ls.length}`);
  }
  console.log(`  active play ${h(median(runs.map((r) => r.activeSec)))}, hunt retreats ${median(runs.map((r) => r.huntLosses))}, end: ${runs[0].final}`);
}
