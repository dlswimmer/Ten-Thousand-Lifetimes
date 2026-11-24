// Headless balance simulator: plays the game with a simple greedy strategy and
// prints when each milestone is first reached. Run: npx tsx sim/sim.ts [hours]
import * as E from '../src/game/engine';
import { CHORES, HUNT_GROUNDS, KARMA_NODES, REALMS, TECHNIQUES, clarityPillCost } from '../src/game/data';

const hours = Number(process.argv[2] ?? 3);
const sectChoice = Number(process.env.SECT ?? 0);
const s = E.newGame(0);
s.fatedSect = sectChoice; E.joinSect(s, sectChoice);
let t = 0;
const firsts = new Map<string, number>();
const mark = (key: string) => { if (!firsts.has(key)) { firsts.set(key, t); console.log(`${fmt(t)}  ${key}`); } };
const fmt = (sec: number) => `${Math.floor(sec / 60)}m${String(Math.floor(sec % 60)).padStart(2, '0')}s`;
let lastProgress = 0, lastG = 0;
const priority = ['autoadvance', 'echoes', 'vein', 'longevity', 'autobreak', 'daoheart', 'memories', 'headstart', 'thirdeye', 'fated', 'seclusion'];

function pickHunt() {
  let best: number | null = null;
  HUNT_GROUNDS.forEach((g, i) => {
    if (g.unlockRealm > s.realm) return;
    const m = E.matchup(s, i);
    if (m.killTime < m.surviveTime * 0.8) best = i;
  });
  if (s.hunt.ground !== best) E.setHunt(s, best);
}

function pickChore() {
  const open = CHORES.filter((c) => c.unlockRealm <= s.realm);
  const best = open[open.length - 1];
  if (s.chore.id !== best.id) E.setChore(s, best.id);
}

function shop() {
  // ask the sect library for any manual we can afford
  TECHNIQUES.forEach((_, i) => { if (E.canObtainManual(s, i)) E.obtainManual(s, i); });
  // equip best techniques
  const owned = TECHNIQUES.map((_, i) => i).filter((i) => s.techs[i].owned);
  owned.sort((a, b) => E.techQps(s, b) - E.techQps(s, a));
  const want = owned.slice(0, E.slots(s));
  for (const i of want) if (!s.equipped.includes(i)) E.toggleEquip(s, i);
  for (let guard = 0; guard < 200; guard++) {
    let best = -1, bestVal = 0;
    TECHNIQUES.forEach((tech, i) => {
      if (!s.techs[i].owned) return;
      const cost = E.techCost(s, i);
      if (cost > s.stones) return;
      const lvl = s.techs[i].lvl;
      const gain = lvl === 0 ? tech.baseQps * 3 : E.techQps(s, i) * ((lvl + 1) / lvl) - E.techQps(s, i);
      const useful = s.equipped.includes(i) || lvl === 0 || want.includes(i);
      if (!useful) return;
      const val = gain / cost;
      if (val > bestVal) { bestVal = val; best = i; }
    });
    if (best < 0) break;
    E.buyTech(s, best);
  }
  if (E.atBottleneck(s) && s.stones > clarityPillCost(s.realm) * 2) E.buyClarity(s);
}

const end = hours * 3600;
while (t < end) {
  t += 1;
  E.tick(s, 1);
  for (let tap = 0; tap < 0; tap++) E.circulate(s);
  while (E.canAdvance(s) && !E.atBottleneck(s)) E.advance(s);
  if (E.atBottleneck(s) && E.canAdvance(s) && !E.sealedAtTop(s) && E.breakChance(s) >= 0.5) E.attemptBreakthrough(s);
  if (t % 5 === 0) { shop(); pickHunt(); pickChore(); }
  mark(`${REALMS[s.realm].name}`);
  const g = E.globalStage(s);
  if (g > lastG) { lastG = g; lastProgress = t; if (process.env.STAGES && s.lives <= Number(process.env.STAGES)) console.log(`   ${fmt(t)} L${s.lives} ${REALMS[s.realm].name} ${s.stage} qps=${E.qps(s).toExponential(2)} req=${E.stageReq(s).toExponential(2)} stones/s=${E.stonesPerSec(s).toExponential(2)} hunt=${s.hunt.ground} techs=${s.techs.map(x=>x.lvl).join(',')}`); }
  // voluntary reincarnation when stuck for 4 minutes and karma would be meaningful
  if (!s.passing && E.canReincarnate(s) && t - lastProgress > 240 && E.karmaForLife(s) >= Math.max(3, s.karmaEarned * 0.5)) {
    E.endLife(s, true);
  }
  if (s.passing) {
    console.log(`${fmt(t)}  life ${s.lives} ends (${s.passing.voluntary ? 'chosen' : 'peaceful'}) at ${REALMS[s.realm].name} ${s.stage}, age ${Math.round(s.age)}, +${s.passing.karma} karma`);
    E.beginNextLife(s);
    s.fatedSect = sectChoice; E.joinSect(s, sectChoice);
    lastProgress = t; lastG = 0;
    for (let guard = 0; guard < 100; guard++) {
      const id = priority.find((p) => { const n = KARMA_NODES.find((x) => x.id === p)!; return (s.karmaUp[p] ?? 0) < n.maxLevel && (!n.requires || (s.karmaUp[n.requires] ?? 0) > 0) && E.karmaCost(s, p) <= s.karma; });
      if (!id) break;
      E.buyKarma(s, id);
    }
    console.log(`         karma ups: ${JSON.stringify(s.karmaUp)}`);
  }
}
console.log(`end: life ${s.lives}, ${REALMS[s.realm].name} ${s.stage}, qps ${E.qps(s).toExponential(2)}, age ${Math.round(s.age)}/${Math.round(E.lifespan(s))}`);
