import {
  BASE_STONES_PER_S, ELEMENTS, ELEMENT_MATCH_MULT, Element, FAIL_QI_LOSS, FINAL_REALM,
  HEART_DEMON_CHANCE, HEART_DEMON_MULT, HEART_DEMON_SECONDS, HUNT_GROUNDS, HUNT_RECOVER_S, HUNT_RESPAWN_S,
  INNATE_QPS, INSIGHT_BONUS_MAX, INSIGHT_HALF, KARMA_GROWTH, KARMA_NODES, LONGEVITY_PILL_YEARS,
  MAX_BREAK_PILLS, MAX_LONGEVITY_PILLS, OFFLINE_AGE_RATE, OFFLINE_BASE_CAP_S, PILL_BREAK_BONUS,
  REALMS, REALM_QI_MULT, REALM_STONE_MULT, REQ_BASE, REQ_GROWTH, REQ_REALM_JUMP, ROOT_GRADES,
  SECONDS_PER_YEAR, STAGES_PER_REALM, STAGE_QI_MULT, STAGE_STONE_MULT, START_AGE, STRIKE_MULT,
  TAP_SECONDS, TECHNIQUES, TECH_COST_GROWTH, TECH_MILESTONES, clarityPillCost, headStartStones,
  longevityPillCost, memoryKeep, slotsForRealm, SECTS, starterManual, HUNT_CONTRIB_SHARE, CHORES, CHORE_STAGE_MULT, CHORE_REALM_MULT, CHORE_TAP_SECONDS,
  ELEMENT_STATS, STAT_REALM_MULT, STAT_STAGE_GROWTH, Stats, SECT_RANKS,
  BODY_REALMS, BODY_LEVELS_PER_REALM, BODY_COST_BASE, BODY_COST_GROWTH, VIGOR_BASE, VIGOR_STAGE_GROWTH,
  VIGOR_PER_KILL_SECONDS, VIGOR_TRAIN_SECONDS, PHYSICAL_CHORE_VIGOR, PHYSICAL_CHORES, BODY_STAT_GROWTH,
  BODY_YEARS_PER_LEVEL, SECT_BODY_AFFINITY, type Activity,
} from './data';

export type LogKind = 'info' | 'good' | 'bad' | 'karma';

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
}

export interface TechState {
  owned: boolean; // manual granted by your sect this life
  lvl: number;
  masteryXp: number;
}

export interface HuntState {
  ground: number | null; // index into HUNT_GROUNDS, null = not hunting
  beastHp: number;
  playerHp: number;
  recover: number; // seconds left before you can fight again
  respawn: number; // seconds until the next beast appears
  kills: number;
}

export interface PassingInfo {
  karma: number;
  realm: number;
  stage: number;
  voluntary: boolean;
}

export interface GameState {
  version: 5;
  sect: number | null; // null until an elder brings you to a sect
  fatedSect: number; // the sect whose elder finds you this life
  contribution: number;
  chore: { id: string | null; progress: number; done: number };
  qi: number;
  realm: number;
  stage: number; // 1..9
  stones: number;
  insight: number;
  age: number; // years
  lifeQi: number;
  techs: TechState[];
  equipped: number[];
  root: { element: Element; grade: number };
  clarityPills: number;
  longevityUsed: number;
  bonusYears: number;
  heartDemon: number;
  karma: number;
  karmaEarned: number;
  karmaUp: Record<string, number>;
  lives: number;
  autoAdvance: boolean;
  autoBreak: boolean;
  autoBreakMin: number; // 0..1
  hunt: HuntState;
  body: { level: number; vigor: number };
  activity: Activity; // only one at a time: qi flows only while meditating
  unlocked: string[]; // tabs opened so far; they stay open in later lives
  unseen: string[]; // newly opened tabs the player has not visited yet
  passing: PassingInfo | null; // set when a life ends, cleared when the next life starts
  bestRealm: number;
  log: LogEntry[];
  logSeq: number;
  lastSeen: number;
  playSeconds: number;
}

// ---------- setup ----------

export function newGame(now = Date.now()): GameState {
  const s: GameState = {
    version: 5,
    sect: null, fatedSect: 0, contribution: 0, chore: { id: null, progress: 0, done: 0 },
    qi: 0, realm: 0, stage: 1, stones: 0, insight: 0, age: START_AGE, lifeQi: 0,
    techs: TECHNIQUES.map(() => ({ owned: false, lvl: 0, masteryXp: 0 })),
    equipped: [],
    root: { element: 'Earth', grade: 0 },
    clarityPills: 0, longevityUsed: 0, bonusYears: 0, heartDemon: 0,
    karma: 0, karmaEarned: 0, karmaUp: {},
    lives: 1,
    autoAdvance: true, autoBreak: true, autoBreakMin: 0.6,
    hunt: { ground: null, beastHp: 0, playerHp: 0, recover: 0, respawn: 0, kills: 0 },
    body: { level: 0, vigor: 0 },
    activity: 'meditate',
    unlocked: ['cultivate'], unseen: [],
    passing: null,
    bestRealm: 0,
    log: [], logSeq: 0,
    lastSeen: now, playSeconds: 0,
  };
  s.root = rollRoot(s);
  s.fatedSect = fatedSectFor(s);
  log(s, `You are sixteen, a mortal in Willowford village with a ${rootLabel(s)} spiritual root that nobody has noticed. Yet.`, 'info');
  return s;
}

export function k(s: GameState, id: string): number {
  return s.karmaUp[id] ?? 0;
}

function rollRoot(s: GameState): { element: Element; grade: number } {
  const fated = k(s, 'fated');
  // Fated Root shifts weight from the worst grade toward the best ones.
  const weights = ROOT_GRADES.map((g, i) => {
    if (i === 0) return Math.max(5, g.weight - fated * 9);
    return g.weight * (1 + fated * 0.25 * i);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let grade = 0;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { grade = i; break; }
  }
  const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  return { element, grade };
}

/** The elder who finds you comes from the sect whose library best suits your root. */
export function fatedSectFor(s: GameState): number {
  const scores = SECTS.map((_, i) => TECHNIQUES.filter((t) => t.sect === i && t.element === s.root.element).length + Math.random() * 0.5);
  return scores.indexOf(Math.max(...scores));
}

export function rootLabel(s: GameState): string {
  return `${ROOT_GRADES[s.root.grade].name} ${s.root.element}`;
}

export function log(s: GameState, text: string, kind: LogKind = 'info') {
  s.logSeq += 1;
  s.log.unshift({ id: s.logSeq, text, kind });
  if (s.log.length > 60) s.log.length = 60;
}

// ---------- derived values ----------

export function globalStage(s: GameState): number {
  return s.realm * STAGES_PER_REALM + (s.stage - 1);
}

export function stageReq(s: GameState): number {
  const g = globalStage(s);
  return REQ_BASE * Math.pow(REQ_GROWTH, g) * Math.pow(REQ_REALM_JUMP, s.realm);
}

export function lifespan(s: GameState): number {
  return REALMS[s.realm].lifespan + 20 * k(s, 'longevity') + s.bonusYears + (s.sect === null ? 0 : SECTS[s.sect].bonusYears) + BODY_YEARS_PER_LEVEL * s.body.level;
}

export function masteryLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 15));
}

export function techMilestoneMult(lvl: number): number {
  let m = 1;
  for (const t of TECH_MILESTONES) if (lvl >= t) m *= 2;
  return m;
}

export function techQps(s: GameState, i: number): number {
  const t = TECHNIQUES[i];
  const st = s.techs[i];
  if (st.lvl === 0) return 0;
  const mastery = 1 + 0.1 * masteryLevel(st.masteryXp);
  const match = t.element === s.root.element ? ELEMENT_MATCH_MULT : 1;
  return t.baseQps * st.lvl * techMilestoneMult(st.lvl) * mastery * match;
}

export function globalQiMult(s: GameState): number {
  const g = globalStage(s);
  return Math.pow(STAGE_QI_MULT, g)
    * Math.pow(REALM_QI_MULT, s.realm)
    * ROOT_GRADES[s.root.grade].mult
    * Math.pow(1.5, k(s, 'echoes'))
    * (s.sect === null ? 1 : SECTS[s.sect].qiMult)
    * (s.heartDemon > 0 ? HEART_DEMON_MULT : 1);
}

export function qps(s: GameState): number {
  if (s.sect === null) return 0;
  let base = INNATE_QPS;
  for (const i of s.equipped) base += techQps(s, i);
  return base * globalQiMult(s);
}

export function stonesPerSec(s: GameState): number {
  const g = globalStage(s);
  return BASE_STONES_PER_S * Math.pow(STAGE_STONE_MULT, g) * Math.pow(REALM_STONE_MULT, s.realm) * Math.pow(1.5, k(s, 'vein'));
}

export function techCost(s: GameState, i: number): number {
  return TECHNIQUES[i].baseCost * Math.pow(TECH_COST_GROWTH, s.techs[i].lvl);
}

export function slots(s: GameState): number {
  return slotsForRealm(s.realm);
}

export function insightBonus(s: GameState): number {
  const half = INSIGHT_HALF * (s.realm + 1);
  return INSIGHT_BONUS_MAX * s.insight / (s.insight + half);
}

export function breakChance(s: GameState): number {
  const base = REALMS[s.realm].breakChance;
  const c = base + (s.sect === null ? 0 : SECTS[s.sect].breakBonus) + 0.06 * k(s, 'daoheart') + PILL_BREAK_BONUS * s.clarityPills + insightBonus(s);
  return Math.min(0.98, c);
}

export function atBottleneck(s: GameState): boolean {
  return s.stage === STAGES_PER_REALM;
}

export function canAdvance(s: GameState): boolean {
  return !s.passing && s.sect !== null && s.qi >= stageReq(s);
}

export function sealedAtTop(s: GameState): boolean {
  return s.realm === FINAL_REALM && atBottleneck(s);
}

export function karmaForLife(s: GameState): number {
  const g = globalStage(s);
  return Math.floor(Math.pow(KARMA_GROWTH, g) + 0.0001);
}

export function karmaCost(s: GameState, id: string): number {
  const node = KARMA_NODES.find((n) => n.id === id)!;
  return Math.round(node.baseCost * Math.pow(node.costGrowth, k(s, id)));
}

export function offlineCap(s: GameState): number {
  return OFFLINE_BASE_CAP_S + k(s, 'seclusion') * 4 * 3600;
}

// ---------- body cultivation ----------

export function bodyRealmName(level: number): string {
  if (level === 0) return 'Untempered';
  const r = Math.min(BODY_REALMS.length - 1, Math.floor((level - 1) / BODY_LEVELS_PER_REALM));
  const step = level - r * BODY_LEVELS_PER_REALM;
  return `${BODY_REALMS[r]} ${step}`;
}

/** The body can only be tempered as far as your qi realm can support. */
export function bodyCap(s: GameState): number {
  return Math.min(BODY_REALMS.length, s.realm + 1) * BODY_LEVELS_PER_REALM;
}

export function bodyCost(s: GameState): number {
  return BODY_COST_BASE * Math.pow(BODY_COST_GROWTH, s.body.level);
}

/** Vigor per second while training the body. */
export function vigorPerSec(s: GameState): number {
  if (s.sect === null) return 0;
  return VIGOR_BASE * Math.pow(VIGOR_STAGE_GROWTH, globalStage(s)) * SECT_BODY_AFFINITY[s.sect];
}

/** Vigor per second from whatever you are doing right now. */
export function currentVigorRate(s: GameState): number {
  if (s.activity === 'train') return vigorPerSec(s);
  if (s.activity === 'chores' && s.chore.id !== null && PHYSICAL_CHORES.includes(s.chore.id)) return vigorPerSec(s) * PHYSICAL_CHORE_VIGOR;
  return 0;
}

/** Share of the meditation qi rate you keep while doing something else. */
export function qiShare(s: GameState): number {
  return s.activity === 'meditate' ? 1 : Math.min(1, 0.2 * k(s, 'unceasing'));
}

export function setActivity(s: GameState, a: Activity) {
  if (s.sect === null || s.passing) return;
  s.activity = a;
  if (a === 'chores' && s.chore.id === null) s.chore = { id: CHORES[0].id, progress: 0, done: s.chore.done };
  if (a === 'hunt' && s.hunt.ground === null) setHunt(s, 0);
  if (a !== 'hunt') s.hunt.ground = null;
}

export function canTemper(s: GameState): boolean {
  return s.sect !== null && !s.passing && s.body.level < bodyCap(s) && s.body.vigor >= bodyCost(s);
}

export function temperBody(s: GameState): boolean {
  if (!canTemper(s)) return false;
  s.body.vigor -= bodyCost(s);
  s.body.level += 1;
  if (s.body.level % BODY_LEVELS_PER_REALM === 1) log(s, `Your body reaches ${BODY_REALMS[Math.floor((s.body.level - 1) / BODY_LEVELS_PER_REALM)]}.`, 'good');
  return true;
}

export function trainBody(s: GameState) {
  if (s.sect === null || s.passing || s.activity !== 'train') return;
  s.body.vigor += vigorPerSec(s) * VIGOR_TRAIN_SECONDS;
}

export function sectRank(s: GameState): string {
  return SECT_RANKS[Math.min(SECT_RANKS.length - 1, s.realm)];
}

export function elixirMult(s: GameState): number {
  return s.sect === null ? 1 : SECTS[s.sect].elixirCostMult;
}

/** Manual bonus to stats: grows with level and mastery, by the manual's element. */
export function manualStatBonus(s: GameState): Stats {
  const b: Stats = { attack: 0, defense: 0, vitality: 0, speed: 0 };
  for (const i of s.equipped) {
    const t = TECHNIQUES[i];
    const st = s.techs[i];
    if (st.lvl === 0) continue;
    const power = 0.25 * Math.log2(1 + st.lvl) * (1 + 0.1 * masteryLevel(st.masteryXp));
    const shares = ELEMENT_STATS[t.element];
    for (const key of Object.keys(shares) as (keyof Stats)[]) b[key] += power * (shares[key] ?? 0);
  }
  return b;
}

export function playerStats(s: GameState): Stats {
  const g = globalStage(s);
  const p = 10 * Math.pow(STAT_STAGE_GROWTH, g) * Math.pow(STAT_REALM_MULT, s.realm);
  const b = manualStatBonus(s);
  const sect = s.sect === null ? null : SECTS[s.sect];
  return {
    attack: p * (1 + b.attack) * (sect?.huntAtkMult ?? 1) * Math.pow(BODY_STAT_GROWTH.attack, s.body.level),
    defense: 0.6 * p * (1 + b.defense) * Math.pow(BODY_STAT_GROWTH.defense, s.body.level),
    vitality: 10 * p * (1 + b.vitality) * Math.pow(BODY_STAT_GROWTH.vitality, s.body.level),
    speed: (10 + 2 * g) * (1 + b.speed) * Math.pow(BODY_STAT_GROWTH.speed, s.body.level),
  };
}

/** Damage per second one side deals to the other. Defense softens hits; speed decides who strikes more often. */
export function damagePerSec(att: Stats, def: Stats): number {
  const speed = Math.min(2, Math.max(0.5, Math.sqrt(att.speed / def.speed)));
  return att.attack * (att.attack / (att.attack + def.defense)) * speed;
}

export interface Matchup { killTime: number; surviveTime: number; verdict: 'Easy' | 'Risky' | 'Too dangerous' }

export function matchup(s: GameState, ground: number): Matchup {
  const me = playerStats(s);
  const beast = HUNT_GROUNDS[ground].stats;
  const killTime = beast.vitality / Math.max(1e-9, damagePerSec(me, beast));
  const incoming = damagePerSec(beast, me) - me.vitality * HUNT_REGEN;
  const surviveTime = incoming <= 0 ? Infinity : me.vitality / incoming;
  const verdict = killTime < surviveTime * 0.5 ? 'Easy' : killTime < surviveTime ? 'Risky' : 'Too dangerous';
  return { killTime, surviveTime, verdict };
}

export const HUNT_REGEN = 0.02; // share of vitality recovered per second in a fight

const UNLOCKS: { tab: string; when: (s: GameState) => boolean; text: string }[] = [
  { tab: 'techniques', when: (s) => s.sect !== null, text: 'The Sect tab opens: chores, and the Scripture Pavilion where contribution buys manuals.' },
  { tab: 'hunt', when: (s) => s.sect !== null && (s.realm > 0 || s.stage >= 3), text: 'The outer disciples invite you on a beast hunt. The Hunt tab opens.' },
  { tab: 'elixirs', when: (s) => s.realm >= 1, text: 'As an Inner Disciple you may now visit the Elixir Pavilion.' },
  {
    tab: 'karma',
    when: (s) => s.passing !== null || s.karmaEarned > 0 || s.age >= START_AGE + 0.8 * (lifespan(s) - START_AGE),
    text: 'Your years grow short, and you begin to sense the cycle of rebirth. The Karma tab opens.',
  },
];

/** Opens tabs as the player progresses, so the game reveals itself a piece at a time. */
export function checkUnlocks(s: GameState) {
  for (const u of UNLOCKS) {
    if (!s.unlocked.includes(u.tab) && u.when(s)) {
      s.unlocked.push(u.tab);
      s.unseen.push(u.tab);
      log(s, u.text, 'good');
    }
  }
}

export function markSeen(s: GameState, tab: string) {
  s.unseen = s.unseen.filter((t) => t !== tab);
}

export function canReincarnate(s: GameState): boolean {
  return s.realm >= 1 && !s.passing;
}

// ---------- actions ----------

export function circulate(s: GameState) {
  if (s.passing || s.activity !== 'meditate') return;
  const gain = Math.max(1, qps(s) * TAP_SECONDS);
  s.qi += gain;
  s.lifeQi += gain;
}

export function advance(s: GameState): boolean {
  if (!canAdvance(s)) return false;
  if (atBottleneck(s)) return attemptBreakthrough(s);
  s.qi -= stageReq(s);
  s.stage += 1;
  return true;
}

export function attemptBreakthrough(s: GameState): boolean {
  if (!canAdvance(s) || !atBottleneck(s) || sealedAtTop(s)) return false;
  const chance = breakChance(s);
  const usedPills = s.clarityPills;
  s.clarityPills = 0;
  if (Math.random() < chance) {
    s.qi = 0;
    s.realm += 1;
    s.stage = 1;
    s.insight = 0;
    s.bestRealm = Math.max(s.bestRealm, s.realm);
    // Keep equipped list within new slot count; add newly opened slots automatically.
    autoEquip(s);
    log(s, `Breakthrough! You enter ${REALMS[s.realm].name}. Lifespan rises to ${Math.round(lifespan(s))} years.`, 'good');
    return true;
  }
  s.qi *= 1 - FAIL_QI_LOSS;
  const gained = Math.round((8 + 6 * s.realm) * (1 + 0.5 * k(s, 'thirdeye')) * (0.8 + Math.random() * 0.4));
  s.insight += gained;
  let msg = `Breakthrough failed (${Math.round(chance * 100)}% chance${usedPills ? `, ${usedPills} pill${usedPills > 1 ? 's' : ''} used` : ''}). You gain ${gained} Insight.`;
  if (Math.random() < HEART_DEMON_CHANCE) {
    s.heartDemon = HEART_DEMON_SECONDS;
    msg += ' A heart demon stirs: qi halved for a short while.';
  }
  log(s, msg, 'bad');
  return false;
}

export function joinSect(s: GameState, sect: number) {
  if (s.sect !== null || s.passing) return;
  if (sect !== s.fatedSect && !k(s, 'fatedmeeting')) return;
  s.sect = sect;
  const first = starterManual(sect);
  s.techs[first].owned = true;
  s.techs[first].lvl = 1;
  s.equipped = [first];
  s.chore = { id: CHORES[0].id, progress: 0, done: 0 };
  s.activity = 'meditate';
  log(s, `${SECTS[sect].elder} brings you to the ${SECTS[sect].name}. As a new Outer Disciple you receive ${TECHNIQUES[first].name}, a broom and a long list of chores.`, 'good');
  checkUnlocks(s);
}

export function choreReward(s: GameState, i: number): number {
  return CHORES[i].contribution * Math.pow(CHORE_STAGE_MULT, globalStage(s)) * Math.pow(CHORE_REALM_MULT, s.realm);
}

export function setChore(s: GameState, id: string | null) {
  if (s.sect === null) return;
  const c = CHORES.find((x) => x.id === id);
  if (id !== null && (!c || c.unlockRealm > s.realm)) return;
  s.chore = { id, progress: 0, done: s.chore.done };
  if (id !== null) s.activity = 'chores';
}

export function workHard(s: GameState) {
  if (s.chore.id === null || s.passing || s.activity !== 'chores') return;
  tickChore(s, CHORE_TAP_SECONDS);
}

function tickChore(s: GameState, dt: number) {
  if (s.chore.id === null) return;
  const i = CHORES.findIndex((x) => x.id === s.chore.id);
  const c = CHORES[i];
  s.chore.progress += dt;
  while (s.chore.progress >= c.seconds) {
    s.chore.progress -= c.seconds;
    s.contribution += choreReward(s, i);
    s.chore.done += 1;
  }
}

export function canObtainManual(s: GameState, i: number): boolean {
  const t = TECHNIQUES[i];
  return s.sect === t.sect && !s.techs[i].owned && t.unlockRealm <= s.realm && s.contribution >= t.manualCost;
}

export function obtainManual(s: GameState, i: number): boolean {
  if (!canObtainManual(s, i)) return false;
  const t = TECHNIQUES[i];
  s.contribution -= t.manualCost;
  s.techs[i].owned = true;
  s.techs[i].lvl = 1;
  log(s, `The Scripture Pavilion grants you ${t.name}.`, 'good');
  if (s.equipped.length < slots(s)) s.equipped.push(i);
  return true;
}

export function buyTech(s: GameState, i: number): boolean {
  if (!s.techs[i].owned) return false;
  const cost = techCost(s, i);
  if (s.stones < cost) return false;
  s.stones -= cost;
  s.techs[i].lvl += 1;
  return true;
}

export function toggleEquip(s: GameState, i: number): boolean {
  const at = s.equipped.indexOf(i);
  if (at >= 0) {
    if (s.equipped.length === 1) return false; // always keep one technique running
    s.equipped.splice(at, 1);
    return true;
  }
  if (s.techs[i].lvl === 0) return false;
  if (s.equipped.length >= slots(s)) s.equipped.shift();
  s.equipped.push(i);
  return true;
}

function autoEquip(s: GameState) {
  while (s.equipped.length > slots(s)) s.equipped.shift();
  const owned = TECHNIQUES.map((_, i) => i).filter((i) => s.techs[i].owned && !s.equipped.includes(i));
  owned.sort((a, b) => techQps(s, b) - techQps(s, a));
  while (s.equipped.length < slots(s) && owned.length) s.equipped.push(owned.shift()!);
}

export function buyClarity(s: GameState): boolean {
  const cost = clarityPillCost(s.realm) * elixirMult(s);
  if (s.stones < cost || s.clarityPills >= MAX_BREAK_PILLS) return false;
  s.stones -= cost;
  s.clarityPills += 1;
  return true;
}

export function buyLongevity(s: GameState): boolean {
  const cost = longevityPillCost(s.realm, s.longevityUsed) * elixirMult(s);
  if (s.stones < cost || s.longevityUsed >= MAX_LONGEVITY_PILLS) return false;
  s.stones -= cost;
  s.longevityUsed += 1;
  s.bonusYears += LONGEVITY_PILL_YEARS;
  log(s, `You swallow a Crane Longevity Pill. +${LONGEVITY_PILL_YEARS} years.`, 'good');
  return true;
}

export function buyKarma(s: GameState, id: string): boolean {
  const node = KARMA_NODES.find((n) => n.id === id);
  if (!node) return false;
  if (k(s, id) >= node.maxLevel) return false;
  if (node.requires && k(s, node.requires) === 0) return false;
  const cost = karmaCost(s, id);
  if (s.karma < cost) return false;
  s.karma -= cost;
  s.karmaUp[id] = k(s, id) + 1;
  return true;
}

/** Ends the current life. Voluntary or natural, the reward is identical. */
export function endLife(s: GameState, voluntary: boolean) {
  if (s.passing) return;
  const karma = karmaForLife(s);
  s.passing = { karma, realm: s.realm, stage: s.stage, voluntary };
  s.hunt.ground = null;
}

/** Banks the karma from the ended life and starts the next one. */
export function beginNextLife(s: GameState) {
  if (!s.passing) return;
  const { karma } = s.passing;
  s.karma += karma;
  s.karmaEarned += karma;
  const keep = memoryKeep(k(s, 'memories'));
  s.techs = s.techs.map((t) => ({ owned: false, lvl: 0, masteryXp: t.masteryXp * keep }));
  s.equipped = [];
  s.sect = null;
  s.contribution = 0;
  s.chore = { id: null, progress: 0, done: 0 };
  s.qi = 0; s.realm = 0; s.stage = 1; s.insight = 0; s.age = START_AGE; s.lifeQi = 0;
  s.stones = headStartStones(k(s, 'headstart'));
  s.clarityPills = 0; s.longevityUsed = 0; s.bonusYears = 0; s.heartDemon = 0;
  s.hunt = { ground: null, beastHp: 0, playerHp: 0, recover: 0, respawn: 0, kills: 0 };
  s.body = { level: 0, vigor: 0 };
  s.activity = 'meditate';
  s.lives += 1;
  s.root = rollRoot(s);
  s.fatedSect = fatedSectFor(s);
  s.passing = null;
  log(s, `Life ${s.lives} begins with ${karma} new Karma. At sixteen, an elder comes looking for you again. Spiritual root: ${rootLabel(s)}.`, 'karma');
}

export function setHunt(s: GameState, ground: number | null) {
  if (s.sect === null) return;
  if (ground !== null && HUNT_GROUNDS[ground].unlockRealm > s.realm) return;
  s.hunt.ground = ground;
  if (ground === null) { if (s.activity === 'hunt') s.activity = 'meditate'; } else s.activity = 'hunt';
  if (ground !== null) {
    s.hunt.beastHp = HUNT_GROUNDS[ground].stats.vitality;
    s.hunt.playerHp = playerStats(s).vitality;
  }
}

export function strike(s: GameState) {
  const h = s.hunt;
  if (h.ground === null || h.recover > 0 || h.respawn > 0 || s.passing) return;
  h.beastHp -= damagePerSec(playerStats(s), HUNT_GROUNDS[h.ground].stats) * STRIKE_MULT * 0.5;
  resolveKill(s);
}

function resolveKill(s: GameState) {
  const h = s.hunt;
  if (h.ground === null || h.beastHp > 0) return;
  const g = HUNT_GROUNDS[h.ground];
  const reward = g.stones * Math.pow(1.5, k(s, 'vein'));
  s.stones += reward;
  s.contribution += reward * HUNT_CONTRIB_SHARE;
  s.body.vigor += vigorPerSec(s) * VIGOR_PER_KILL_SECONDS * 0.5;
  h.kills += 1;
  h.beastHp = g.stats.vitality;
  h.respawn = HUNT_RESPAWN_S;
}

// ---------- simulation ----------

function tickHunt(s: GameState, dt: number) {
  const h = s.hunt;
  if (h.ground === null) return;
  const me = playerStats(s);
  if (h.recover > 0) {
    h.recover = Math.max(0, h.recover - dt);
    if (h.recover === 0) h.playerHp = me.vitality;
    return;
  }
  if (h.respawn > 0) {
    h.respawn = Math.max(0, h.respawn - dt);
    h.playerHp = Math.min(me.vitality, h.playerHp + me.vitality * 0.1 * dt);
    return;
  }
  const g = HUNT_GROUNDS[h.ground];
  h.beastHp -= damagePerSec(me, g.stats) * dt;
  resolveKill(s);
  h.playerHp -= damagePerSec(g.stats, me) * dt;
  h.playerHp = Math.min(me.vitality, h.playerHp + me.vitality * HUNT_REGEN * dt);
  if (h.playerHp <= 0) {
    // Retreat: no loss, just a short rest.
    h.recover = HUNT_RECOVER_S;
    h.beastHp = g.stats.vitality;
    h.playerHp = 0;
  }
}

/** Advance the game by dt seconds. ageRate scales how fast lifespan passes. */
export function tick(s: GameState, dt: number, ageRate = 1) {
  if (s.passing || s.sect === null) return; // a mortal waiting at the fair does not age
  const share = qiShare(s);
  const gain = qps(s) * share * dt;
  s.qi += gain;
  s.lifeQi += gain;
  s.stones += stonesPerSec(s) * dt;
  if (s.activity === 'chores') tickChore(s, dt);
  s.body.vigor += currentVigorRate(s) * dt;
  for (const i of s.equipped) s.techs[i].masteryXp += dt * share;
  if (s.heartDemon > 0) s.heartDemon = Math.max(0, s.heartDemon - dt);
  if (s.activity === 'hunt') tickHunt(s, dt);

  if (k(s, 'autoadvance') && s.autoAdvance) {
    let guard = 0;
    while (canAdvance(s) && !atBottleneck(s) && guard++ < 20) advance(s);
    while (canTemper(s) && guard++ < 40) temperBody(s);
  }
  if (k(s, 'autobreak') && s.autoBreak && atBottleneck(s) && canAdvance(s) && !sealedAtTop(s)
      && breakChance(s) >= s.autoBreakMin) {
    attemptBreakthrough(s);
  }

  checkUnlocks(s);
  s.age += (dt / SECONDS_PER_YEAR) * ageRate;
  s.playSeconds += dt;
  if (s.age >= lifespan(s)) {
    s.age = lifespan(s);
    endLife(s, false);
    checkUnlocks(s);
  }
}

export interface OfflineReport {
  seconds: number;
  qi: number;
  stones: number;
  stagesGained: number;
  realmsGained: number;
  kills: number;
}

/** Seclusion: replays time spent away. Offline time never ages you. */
export function applyOffline(s: GameState, now = Date.now()): OfflineReport | null {
  const away = Math.min(offlineCap(s), Math.max(0, (now - s.lastSeen) / 1000));
  s.lastSeen = now;
  if (away < 30 || s.passing || s.sect === null) return null;
  const before = { qi: s.lifeQi, stones: s.stones, g: globalStage(s), realm: s.realm, kills: s.hunt.kills };
  const steps = Math.min(4000, Math.ceil(away));
  const dt = away / steps;
  let stonesGained = 0;
  for (let i = 0; i < steps; i++) {
    const st = s.stones;
    tick(s, dt, OFFLINE_AGE_RATE);
    stonesGained += Math.max(0, s.stones - st);
  }
  return {
    seconds: away,
    qi: s.lifeQi - before.qi,
    stones: stonesGained,
    stagesGained: globalStage(s) - before.g,
    realmsGained: s.realm - before.realm,
    kills: s.hunt.kills - before.kills,
  };
}

export const SAVE_KEY = 'ten-thousand-lifetimes-save-v5';

export function serialize(s: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}

export function deserialize(text: string): GameState | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!obj || obj.version !== 5) return null;
    const fresh = newGame();
    const merged: GameState = { ...fresh, ...obj };
    // tolerate saves from builds with fewer techniques
    merged.techs = TECHNIQUES.map((_, i) => obj.techs?.[i] ?? { owned: false, lvl: 0, masteryXp: 0 });
    merged.hunt = { ...fresh.hunt, ...(obj.hunt ?? {}) };
    return merged;
  } catch {
    return null;
  }
}
