import {
  BASE_STONES_PER_S, ELEMENTS, ELEMENT_MATCH_MULT, Element, FAIL_QI_LOSS, FINAL_REALM,
  HEART_DEMON_CHANCE, HEART_DEMON_MULT, HEART_DEMON_SECONDS, HUNT_GROUNDS, HUNT_RECOVER_S, HUNT_RESPAWN_S,
  INNATE_QPS, INSIGHT_BONUS_MAX, INSIGHT_HALF, KARMA_GROWTH, KARMA_NODES, LONGEVITY_PILL_YEARS,
  MAX_BREAK_PILLS, MAX_LONGEVITY_PILLS, OFFLINE_AGE_RATE, OFFLINE_BASE_CAP_S, PILL_BREAK_BONUS,
  REALMS, REALM_QI_MULT, REALM_STONE_MULT, REQ_BASE, REQ_GROWTH, REQ_REALM_JUMP, ROOT_GRADES,
  SECONDS_PER_YEAR, STAGES_PER_REALM, STAGE_QI_MULT, STAGE_STONE_MULT, START_AGE, STRIKE_MULT,
  TAP_SECONDS, TECHNIQUES, TECH_COST_GROWTH, TECH_MILESTONES, clarityPillCost, headStartStones,
  longevityPillCost, memoryKeep, slotsForRealm,
} from './data';

export type LogKind = 'info' | 'good' | 'bad' | 'karma';

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
}

export interface TechState {
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
  version: 1;
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
    version: 1,
    qi: 0, realm: 0, stage: 1, stones: 0, insight: 0, age: START_AGE, lifeQi: 0,
    techs: TECHNIQUES.map(() => ({ lvl: 0, masteryXp: 0 })),
    equipped: [0],
    root: { element: 'Earth', grade: 0 },
    clarityPills: 0, longevityUsed: 0, bonusYears: 0, heartDemon: 0,
    karma: 0, karmaEarned: 0, karmaUp: {},
    lives: 1,
    autoAdvance: true, autoBreak: true, autoBreakMin: 0.6,
    hunt: { ground: null, beastHp: 0, playerHp: 0, recover: 0, respawn: 0, kills: 0 },
    passing: null,
    bestRealm: 0,
    log: [], logSeq: 0,
    lastSeen: now, playSeconds: 0,
  };
  s.root = rollRoot(s);
  s.techs[0].lvl = 1;
  log(s, `Your first life begins. Spiritual root: ${rootLabel(s)}.`, 'info');
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
  return REALMS[s.realm].lifespan + 20 * k(s, 'longevity') + s.bonusYears;
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
    * (s.heartDemon > 0 ? HEART_DEMON_MULT : 1);
}

export function qps(s: GameState): number {
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
  const c = base + 0.06 * k(s, 'daoheart') + PILL_BREAK_BONUS * s.clarityPills + insightBonus(s);
  return Math.min(0.98, c);
}

export function atBottleneck(s: GameState): boolean {
  return s.stage === STAGES_PER_REALM;
}

export function canAdvance(s: GameState): boolean {
  return !s.passing && s.qi >= stageReq(s);
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

export function playerAttack(s: GameState): number {
  return 2 * Math.pow(qps(s), 0.8);
}

export function playerMaxHp(s: GameState): number {
  const g = globalStage(s);
  return 30 * Math.pow(1.22, g) * Math.pow(2.5, s.realm);
}

export function canReincarnate(s: GameState): boolean {
  return s.realm >= 1 && !s.passing;
}

// ---------- actions ----------

export function circulate(s: GameState) {
  if (s.passing) return;
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

export function buyTech(s: GameState, i: number): boolean {
  if (TECHNIQUES[i].unlockRealm > s.realm) return false;
  const cost = techCost(s, i);
  if (s.stones < cost) return false;
  s.stones -= cost;
  const first = s.techs[i].lvl === 0;
  s.techs[i].lvl += 1;
  if (first) {
    log(s, `You learn ${TECHNIQUES[i].name}.`, 'info');
    if (s.equipped.length < slots(s) && !s.equipped.includes(i)) s.equipped.push(i);
  }
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
  const owned = TECHNIQUES.map((_, i) => i).filter((i) => s.techs[i].lvl > 0 && !s.equipped.includes(i));
  owned.sort((a, b) => techQps(s, b) - techQps(s, a));
  while (s.equipped.length < slots(s) && owned.length) s.equipped.push(owned.shift()!);
}

export function buyClarity(s: GameState): boolean {
  const cost = clarityPillCost(s.realm);
  if (s.stones < cost || s.clarityPills >= MAX_BREAK_PILLS) return false;
  s.stones -= cost;
  s.clarityPills += 1;
  return true;
}

export function buyLongevity(s: GameState): boolean {
  const cost = longevityPillCost(s.realm, s.longevityUsed);
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
  s.techs = s.techs.map((t) => ({ lvl: 0, masteryXp: t.masteryXp * keep }));
  s.techs[0].lvl = 1;
  s.equipped = [0];
  s.qi = 0; s.realm = 0; s.stage = 1; s.insight = 0; s.age = START_AGE; s.lifeQi = 0;
  s.stones = headStartStones(k(s, 'headstart'));
  s.clarityPills = 0; s.longevityUsed = 0; s.bonusYears = 0; s.heartDemon = 0;
  s.hunt = { ground: null, beastHp: 0, playerHp: 0, recover: 0, respawn: 0, kills: 0 };
  s.lives += 1;
  s.root = rollRoot(s);
  s.passing = null;
  log(s, `Life ${s.lives} begins with ${karma} new Karma. Spiritual root: ${rootLabel(s)}.`, 'karma');
}

export function setHunt(s: GameState, ground: number | null) {
  if (ground !== null && HUNT_GROUNDS[ground].unlockRealm > s.realm) return;
  s.hunt.ground = ground;
  if (ground !== null) {
    s.hunt.beastHp = HUNT_GROUNDS[ground].hp;
    s.hunt.playerHp = playerMaxHp(s);
  }
}

export function strike(s: GameState) {
  const h = s.hunt;
  if (h.ground === null || h.recover > 0 || h.respawn > 0 || s.passing) return;
  h.beastHp -= playerAttack(s) * STRIKE_MULT * 0.5;
  resolveKill(s);
}

function resolveKill(s: GameState) {
  const h = s.hunt;
  if (h.ground === null || h.beastHp > 0) return;
  const g = HUNT_GROUNDS[h.ground];
  s.stones += g.stones * Math.pow(1.5, k(s, 'vein'));
  h.kills += 1;
  h.beastHp = g.hp;
  h.respawn = HUNT_RESPAWN_S;
}

// ---------- simulation ----------

function tickHunt(s: GameState, dt: number) {
  const h = s.hunt;
  if (h.ground === null) return;
  if (h.recover > 0) {
    h.recover = Math.max(0, h.recover - dt);
    if (h.recover === 0) h.playerHp = playerMaxHp(s);
    return;
  }
  if (h.respawn > 0) {
    h.respawn = Math.max(0, h.respawn - dt);
    h.playerHp = Math.min(playerMaxHp(s), h.playerHp + playerMaxHp(s) * 0.1 * dt);
    return;
  }
  const g = HUNT_GROUNDS[h.ground];
  h.beastHp -= playerAttack(s) * dt;
  resolveKill(s);
  h.playerHp -= g.atk * dt;
  // passive regeneration
  h.playerHp = Math.min(playerMaxHp(s), h.playerHp + playerMaxHp(s) * 0.03 * dt);
  if (h.playerHp <= 0) {
    // Retreat: no loss, just a short rest.
    h.recover = HUNT_RECOVER_S;
    h.beastHp = g.hp;
    h.playerHp = 0;
  }
}

/** Advance the game by dt seconds. ageRate scales how fast lifespan passes. */
export function tick(s: GameState, dt: number, ageRate = 1) {
  if (s.passing) return;
  const gain = qps(s) * dt;
  s.qi += gain;
  s.lifeQi += gain;
  s.stones += stonesPerSec(s) * dt;
  for (const i of s.equipped) s.techs[i].masteryXp += dt;
  if (s.heartDemon > 0) s.heartDemon = Math.max(0, s.heartDemon - dt);
  tickHunt(s, dt);

  if (k(s, 'autoadvance') && s.autoAdvance) {
    let guard = 0;
    while (canAdvance(s) && !atBottleneck(s) && guard++ < 20) advance(s);
  }
  if (k(s, 'autobreak') && s.autoBreak && atBottleneck(s) && canAdvance(s) && !sealedAtTop(s)
      && breakChance(s) >= s.autoBreakMin) {
    attemptBreakthrough(s);
  }

  s.age += (dt / SECONDS_PER_YEAR) * ageRate;
  s.playSeconds += dt;
  if (s.age >= lifespan(s)) {
    s.age = lifespan(s);
    endLife(s, false);
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
  if (away < 30 || s.passing) return null;
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

export const SAVE_KEY = 'ten-thousand-lifetimes-save-v1';

export function serialize(s: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}

export function deserialize(text: string): GameState | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!obj || obj.version !== 1) return null;
    const fresh = newGame();
    const merged: GameState = { ...fresh, ...obj };
    // tolerate saves from builds with fewer techniques
    merged.techs = TECHNIQUES.map((_, i) => obj.techs?.[i] ?? { lvl: 0, masteryXp: 0 });
    merged.hunt = { ...fresh.hunt, ...(obj.hunt ?? {}) };
    return merged;
  } catch {
    return null;
  }
}
