// All tunable game content lives here so balance changes never touch engine logic.

export const SECONDS_PER_YEAR = 4;
export const START_AGE = 16;
export const STAGES_PER_REALM = 9;
export const OFFLINE_BASE_CAP_S = 8 * 3600;
export const OFFLINE_AGE_RATE = 0; // seclusion never ages you: time paces the game but never pressures it

export interface Realm {
  name: string;
  lifespan: number; // total years of life at this realm
  breakChance: number; // base chance to break through FROM this realm
  blurb: string;
}

export const REALMS: Realm[] = [
  { name: 'Body Tempering', lifespan: 80, breakChance: 0.8, blurb: 'You harden flesh and bone so it can hold qi at all.' },
  { name: 'Qi Gathering', lifespan: 130, breakChance: 0.6, blurb: 'Qi pools in your dantian like rain in a cupped hand.' },
  { name: 'Foundation Establishment', lifespan: 220, breakChance: 0.45, blurb: 'Your dao foundation is laid. Pills and mortal herbs answer your call.' },
  { name: 'Golden Core', lifespan: 380, breakChance: 0.32, blurb: 'Qi condenses into a core that glows like a second sun.' },
  { name: 'Nascent Soul', lifespan: 650, breakChance: 0.22, blurb: 'A tiny soul sits cross-legged within your core.' },
];

// The breakthrough out of the last realm (Ascension) is sealed in this prototype.
export const FINAL_REALM = REALMS.length - 1;

export type Element = 'Metal' | 'Wood' | 'Water' | 'Fire' | 'Earth';
export const ELEMENTS: Element[] = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];

export const ELEMENT_GLYPH: Record<Element, string> = {
  Metal: '金',
  Wood: '木',
  Water: '水',
  Fire: '火',
  Earth: '土',
};

export interface RootGrade {
  name: string;
  mult: number;
  weight: number;
}

export const ROOT_GRADES: RootGrade[] = [
  { name: 'Mottled', mult: 1, weight: 50 },
  { name: 'Common', mult: 1.5, weight: 33 },
  { name: 'Fine', mult: 2.5, weight: 13 },
  { name: 'Heavenly', mult: 4, weight: 4 },
];

export const ELEMENT_MATCH_MULT = 1.6;

export interface Technique {
  id: string;
  name: string;
  element: Element;
  baseQps: number; // qi per second per level
  baseCost: number; // spirit stones for level 1
  unlockRealm: number;
  blurb: string;
}

export const TECHNIQUES: Technique[] = [
  { id: 'ninebreaths', name: 'Nine Breaths Sitting', element: 'Earth', baseQps: 1, baseCost: 8, unlockRealm: 0, blurb: 'A village elder\'s breathing drill. Humble, steady.' },
  { id: 'emberheart', name: 'Ember Heart Sutra', element: 'Fire', baseQps: 9, baseCost: 120, unlockRealm: 0, blurb: 'Fans a small flame below the navel.' },
  { id: 'willowroot', name: 'Willow Root Breathing', element: 'Wood', baseQps: 90, baseCost: 3000, unlockRealm: 1, blurb: 'Draw qi up from the earth like sap.' },
  { id: 'stilllake', name: 'Still Lake Mind Art', element: 'Water', baseQps: 1100, baseCost: 1.2e5, unlockRealm: 2, blurb: 'A mind without ripples gathers more.' },
  { id: 'ironspine', name: 'Iron Spine Scripture', element: 'Metal', baseQps: 15000, baseCost: 6e6, unlockRealm: 3, blurb: 'Forge the spine into a channel of steel.' },
  { id: 'thousandrivers', name: 'Thousand Rivers Return', element: 'Water', baseQps: 2.2e5, baseCost: 4e8, unlockRealm: 4, blurb: 'Every river runs to the sea. So does every breath of qi.' },
];

export const TECH_COST_GROWTH = 1.18;
export const TECH_MILESTONES = [10, 25, 50, 100, 150, 200]; // each doubles that technique

export function slotsForRealm(realm: number): number {
  if (realm >= 3) return 3;
  if (realm >= 1) return 2;
  return 1;
}

// Minor stage and realm multipliers to qi and stones.
export const STAGE_QI_MULT = 1.08;
export const REALM_QI_MULT = 2;
export const STAGE_STONE_MULT = 1.12;
export const REALM_STONE_MULT = 1.8;
export const BASE_STONES_PER_S = 1;
export const INNATE_QPS = 1;

// Qi needed to fill the bar at global stage index g (realm * 9 + stage - 1).
export const REQ_BASE = 25;
export const REQ_GROWTH = 1.55;
export const REQ_REALM_JUMP = 3;

export const TAP_SECONDS = 1; // a Circulate tap is worth this many seconds of qi

// Breakthrough
export const PILL_BREAK_BONUS = 0.12;
export const MAX_BREAK_PILLS = 3;
export const INSIGHT_BONUS_MAX = 0.45;
export const INSIGHT_HALF = 30; // insight needed for half the max bonus, per realm+1
export const FAIL_QI_LOSS = 0.5;
export const HEART_DEMON_CHANCE = 0.35;
export const HEART_DEMON_SECONDS = 30;
export const HEART_DEMON_MULT = 0.5;

export interface PillDef {
  id: 'clarity' | 'longevity';
  name: string;
  blurb: string;
}

export const PILLS: PillDef[] = [
  { id: 'clarity', name: 'Clear Meridian Pill', blurb: `+${PILL_BREAK_BONUS * 100}% breakthrough chance. Consumed on your next attempt. Hold up to ${MAX_BREAK_PILLS}.` },
  { id: 'longevity', name: 'Crane Longevity Pill', blurb: '+15 years of life. Pill toxicity limits you to 3 per life.' },
];

export const LONGEVITY_PILL_YEARS = 15;
export const MAX_LONGEVITY_PILLS = 3;

export function clarityPillCost(realm: number): number {
  return 60 * Math.pow(9, realm);
}

export function longevityPillCost(realm: number, used: number): number {
  return 400 * Math.pow(10, realm) * Math.pow(4, used);
}

// Karma: earned on reincarnation from the peak stage reached that life.
export const KARMA_GROWTH = 1.22;

export interface KarmaNode {
  id: string;
  name: string;
  blurb: (lvl: number) => string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  requires?: string;
}

export const KARMA_NODES: KarmaNode[] = [
  { id: 'echoes', name: 'Echoes of Cultivation', blurb: (l) => `Qi gain x${fmtMult(Math.pow(1.5, l))} (next x${fmtMult(Math.pow(1.5, l + 1))})`, baseCost: 1, costGrowth: 2, maxLevel: 40 },
  { id: 'vein', name: 'Spirit Vein Memory', blurb: (l) => `Spirit stones x${fmtMult(Math.pow(1.5, l))} (next x${fmtMult(Math.pow(1.5, l + 1))})`, baseCost: 1, costGrowth: 2, maxLevel: 40 },
  { id: 'longevity', name: 'Longevity', blurb: (l) => `+${l * 20} years of lifespan (next +${(l + 1) * 20})`, baseCost: 2, costGrowth: 2.2, maxLevel: 15 },
  { id: 'memories', name: 'Past-Life Memories', blurb: (l) => `Keep ${Math.round(memoryKeep(l) * 100)}% of technique mastery when reborn (next ${Math.round(memoryKeep(l + 1) * 100)}%)`, baseCost: 3, costGrowth: 2.5, maxLevel: 5 },
  { id: 'headstart', name: 'Inherited Pouch', blurb: (l) => l === 0 ? 'Start each life with spirit stones' : `Start each life with ${headStartStones(l)} stones (next ${headStartStones(l + 1)})`, baseCost: 2, costGrowth: 3, maxLevel: 8 },
  { id: 'fated', name: 'Fated Root', blurb: (l) => `Better spiritual root odds (level ${l}/5)`, baseCost: 4, costGrowth: 2.5, maxLevel: 5 },
  { id: 'daoheart', name: 'Unshaken Dao Heart', blurb: (l) => `+${l * 6}% breakthrough chance (next +${(l + 1) * 6}%)`, baseCost: 5, costGrowth: 3, maxLevel: 5 },
  { id: 'thirdeye', name: 'Third Eye', blurb: (l) => `Insight from failures x${fmtMult(1 + 0.5 * l)} (next x${fmtMult(1 + 0.5 * (l + 1))})`, baseCost: 3, costGrowth: 2.5, maxLevel: 6 },
  { id: 'autoadvance', name: 'Flowing Stages', blurb: () => 'Automation: advance minor stages on your own', baseCost: 6, costGrowth: 1, maxLevel: 1 },
  { id: 'autobreak', name: 'Heaven-Sensing Instinct', blurb: () => 'Automation: attempt breakthroughs when the odds are good', baseCost: 25, costGrowth: 1, maxLevel: 1, requires: 'autoadvance' },
  { id: 'seclusion', name: 'Deep Seclusion', blurb: (l) => `Offline gains capped at ${8 + l * 4}h (next ${8 + (l + 1) * 4}h)`, baseCost: 4, costGrowth: 2.5, maxLevel: 6 },
];

export function memoryKeep(lvl: number): number {
  return Math.min(1, 0.1 + 0.15 * lvl);
}

export function headStartStones(lvl: number): number {
  return lvl === 0 ? 0 : Math.round(50 * Math.pow(12, lvl - 1));
}

function fmtMult(x: number): string {
  if (x < 100) return x.toFixed(x < 10 ? 2 : 1).replace(/\.?0+$/, '');
  return x.toExponential(2);
}

// Beast hunts: an auto-battle side activity that pays spirit stones.
export interface HuntGround {
  id: string;
  name: string;
  beast: string;
  unlockRealm: number;
  hp: number;
  atk: number;
  stones: number;
}

export const HUNT_GROUNDS: HuntGround[] = [
  { id: 'grove', name: 'Misty Bamboo Grove', beast: 'Iron-Bristle Boar', unlockRealm: 0, hp: 40, atk: 3, stones: 4 },
  { id: 'ravine', name: 'Whispering Ravine', beast: 'Ravine Shadow Lynx', unlockRealm: 1, hp: 4000, atk: 60, stones: 24 },
  { id: 'plateau', name: 'Ashen Plateau', beast: 'Cinder-Wing Hawk', unlockRealm: 2, hp: 6e5, atk: 2500, stones: 120 },
  { id: 'palace', name: 'Drowned Palace', beast: 'Pearl-Eyed Serpent', unlockRealm: 3, hp: 1.5e8, atk: 1.2e5, stones: 600 },
  { id: 'peak', name: 'Thunderhead Peak', beast: 'Storm-Maned Qilin', unlockRealm: 4, hp: 5e10, atk: 8e6, stones: 3000 },
];

export const HUNT_RECOVER_S = 8;
export const HUNT_RESPAWN_S = 2; // a new beast appears this long after a kill
export const STRIKE_MULT = 2;
