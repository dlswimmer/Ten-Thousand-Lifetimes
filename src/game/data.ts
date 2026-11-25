// All tunable game content lives here so balance changes never touch engine logic.

export const SECONDS_PER_YEAR = 4;
export const START_AGE = 16;
export const STAGES_PER_REALM = 9;
export const OFFLINE_BASE_CAP_S = 8 * 3600;
export const OFFLINE_AGE_RATE = 1; // seclusion ages you like play does, so it is banked and you choose when to use it

export interface Realm {
  name: string;
  lifespan: number; // total years of life at this realm
  breakChance: number; // base chance to break through FROM this realm
  blurb: string;
}

export const REALMS: Realm[] = [
  { name: 'Qi Sensing', lifespan: 80, breakChance: 0.8, blurb: 'You learn to feel the faint qi in the air and draw it in with every breath.' },
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

export interface Sect {
  name: string;
  elder: string;
  greeting: string;
  motto: string;
  bonus: string;
  qiMult: number;
  huntAtkMult: number;
  elixirCostMult: number;
  bonusYears: number;
  breakBonus: number;
}

// Sects recruit at the village fair each life. Each keeps its own library of manuals.
export const SECTS: Sect[] = [
  { name: 'Azure Cloud Sect', elder: 'Elder Lan Qiuyu', greeting: 'A woman in grey-blue robes steps down from a drifting cloud. "Your qi moves like water finding its level. Come. The Azure Cloud Sect has room for one more."', motto: 'Like clouds, qi gathers where it is not forced.', bonus: 'Qi gain +30%', qiMult: 1.3, huntAtkMult: 1, elixirCostMult: 1, bonusYears: 0, breakBonus: 0 },
  { name: 'Crimson Furnace Valley', elder: 'Elder Huo Zhen', greeting: 'A broad man smelling of charcoal grips your wrist and feels your pulse. "Hot blood, stubborn bones. You will do. Crimson Furnace Valley, boy or girl, we leave at dawn."', motto: 'Temper the body in fire and the will in smoke.', bonus: 'Hunt attack +20%, elixirs 30% cheaper', qiMult: 1, huntAtkMult: 1.2, elixirCostMult: 0.7, bonusYears: 0, breakBonus: 0 },
  { name: 'Stoneheart Monastery', elder: 'Abbot Shi Mo', greeting: 'An old monk who has sat by the village well for three days finally opens his eyes. "You have a patient root. The mountain is a long walk. Shall we begin?"', motto: 'The mountain does not hurry, and outlives everything.', bonus: '+30 years of life, +5% breakthrough chance', qiMult: 1, huntAtkMult: 1, elixirCostMult: 1, bonusYears: 30, breakBonus: 0.05 },
];

export const SECT_RANKS = ['Outer Disciple', 'Inner Disciple', 'Core Disciple', 'True Disciple', 'Elder'];

export interface Technique {
  id: string;
  name: string;
  sect: number; // which sect's library holds this manual
  tier: number; // 0 is the starter manual every new disciple receives
  element: Element;
  baseQps: number; // qi per second per level
  baseCost: number; // spirit stones to train level 1
  manualCost: number; // sect contribution to be granted the manual
  unlockRealm: number; // also the sect rank required
  blurb: string;
}

// Every sect library has the same power ladder, so no sect is a trap; names and elements differ.
const TIERS = [
  { baseQps: 1, baseCost: 8, manualCost: 0, unlockRealm: 0 },
  { baseQps: 9, baseCost: 120, manualCost: 40, unlockRealm: 0 },
  { baseQps: 90, baseCost: 3000, manualCost: 900, unlockRealm: 1 },
  { baseQps: 1100, baseCost: 1.2e5, manualCost: 1.5e4, unlockRealm: 2 },
  { baseQps: 15000, baseCost: 6e6, manualCost: 2.5e5, unlockRealm: 3 },
  { baseQps: 2.2e5, baseCost: 4e8, manualCost: 3e6, unlockRealm: 4 },
];

type ManualText = [string, string, Element, string];
const LIBRARIES: ManualText[][] = [
  [
    ['cloudgaze', 'Cloud-Gazing Breath', 'Water', 'Every new disciple lies on the cloud terrace and learns to breathe with the sky.'],
    ['driftmist', 'Drifting Mist Sutra', 'Water', 'Let qi spread thin as mist, then gather it in a single breath.'],
    ['rainpine', 'Rain-on-Pine Method', 'Wood', 'Qi falls like rain and is drunk by the roots.'],
    ['stilllake', 'Still Lake Mind Art', 'Water', 'A mind without ripples gathers more.'],
    ['silverthunder', 'Silver Thunder Canon', 'Metal', 'Hidden in the sect\'s highest pavilion, it calls lightning into the meridians.'],
    ['thousandrivers', 'Thousand Rivers Return', 'Water', 'Every river runs to the sea. So does every breath of qi.'],
  ],
  [
    ['bellows', 'Bellows Breathing', 'Fire', 'Breathe like a forge bellows: short, hot and steady.'],
    ['emberheart', 'Ember Heart Sutra', 'Fire', 'Fans a small flame below the navel.'],
    ['ironspine', 'Iron Spine Scripture', 'Metal', 'Forge the spine into a channel of steel.'],
    ['moltencore', 'Molten Core Canon', 'Fire', 'Melt the dantian down and pour it into a stronger mould.'],
    ['tenforge', 'Ten-Forge Body Art', 'Metal', 'Ten temperings, each one hotter than the last.'],
    ['phoenixash', 'Phoenix Ash Sutra', 'Fire', 'What burns completely is reborn complete.'],
  ],
  [
    ['ninebreaths', 'Nine Breaths Sitting', 'Earth', 'The monastery\'s first lesson. Humble, steady.'],
    ['mountainroot', 'Mountain Root Stance', 'Earth', 'Stand until the mountain forgets you are not part of it.'],
    ['willowroot', 'Willow Root Breathing', 'Wood', 'Draw qi up from the earth like sap.'],
    ['bedrock', 'Bedrock Silence Sutra', 'Earth', 'Below every noise there is stone, and stone is quiet.'],
    ['deepspring', 'Deep Spring Meditation', 'Water', 'Water that has waited a thousand years under the mountain.'],
    ['unmovingpeak', 'Unmoving Peak Canon', 'Earth', 'Nothing moves the peak. Everything moves around it.'],
  ],
];

export const TECHNIQUES: Technique[] = LIBRARIES.flatMap((lib, sect) =>
  lib.map(([id, name, element, blurb], tier) => ({ id, name, sect, tier, element, blurb, ...TIERS[tier] })),
);

export function starterManual(sect: number): number {
  return TECHNIQUES.findIndex((t) => t.sect === sect && t.tier === 0);
}

// Sect contribution: earned mainly from chores, and partly from beast hunts.
export interface Chore {
  id: string;
  name: string;
  blurb: string;
  seconds: number;
  contribution: number; // at Qi Sensing stage 1; scales with your rank
  unlockRealm: number;
  /** Soft requirement: the stat this chore leans on ('cultivation' = your stage), and the overall stage whose base stats meet it. */
  stat?: ChoreStat;
  needStage?: number;
  /** Hard requirement: you cannot take this chore until you meet its stat; once met it runs at 1x to 2x. */
  hard?: boolean;
}

export type ChoreStat = 'attack' | 'defense' | 'vitality' | 'speed' | 'cultivation';

export const CHORES: Chore[] = [
  { id: 'sweep', name: 'Sweep the courtyard', blurb: 'Ten thousand steps of stone, and every one has leaves on it.', seconds: 10, contribution: 3, unlockRealm: 0 },
  { id: 'water', name: 'Carry water up the mountain', blurb: 'Two buckets, a yoke and nine hundred stairs.', seconds: 25, contribution: 9, unlockRealm: 0, stat: 'vitality', needStage: 2 },
  { id: 'herbs', name: 'Tend the spirit herb garden', blurb: 'Pull weeds without bruising a single leaf of ginseng.', seconds: 60, contribution: 25, unlockRealm: 0, stat: 'speed', needStage: 4 },
  { id: 'gate', name: 'Guard the mountain gate', blurb: 'Stand watch, turn away beggars, welcome the sect\'s guests.', seconds: 120, contribution: 60, unlockRealm: 1, stat: 'defense', needStage: 11, hard: true },
  { id: 'scriptures', name: 'Copy scriptures in the pavilion', blurb: 'Brush every stroke exactly. The elders check.', seconds: 300, contribution: 180, unlockRealm: 1, stat: 'cultivation', needStage: 13, hard: true },
  { id: 'caravan', name: 'Escort a sect caravan', blurb: 'Guard spirit stones on the road to the market town.', seconds: 600, contribution: 420, unlockRealm: 2, stat: 'attack', needStage: 21, hard: true },
  { id: 'instruct', name: 'Instruct outer disciples', blurb: 'Teach the newest disciples the breathing you once struggled with.', seconds: 900, contribution: 720, unlockRealm: 3, stat: 'cultivation', needStage: 30, hard: true },
];

export const CHORE_STAGE_MULT = 1.12;
export const CHORE_REALM_MULT = 4;
export const CHORE_SPEED_MIN = 0.4; // far below a chore's requirement it still gets done, slowly
export const CHORE_SPEED_MAX = 2; // well above it you finish twice as fast
export const CHORE_STAT_EXP = 0.5; // speed = (your stat / requirement) ^ this
export const CHORE_STAGE_SPEED = 1.1; // cultivation chores: speed per stage above or below the requirement
export const CHORE_TAP_SECONDS = 0.5; // tapping a running chore works harder
export const HUNT_CONTRIB_SHARE = 0.25; // contribution per kill as a share of the stone reward

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
export const REQ_GROWTH = 1.65;
export const REQ_REALM_JUMP = 3;

export const TAP_SECONDS = 0.12; // a Circulate tap is worth this many seconds of qi (always at least 1 qi)

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
export const KARMA_GROWTH = 1.18;

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
  { id: 'autoadvance', name: 'Flowing Stages', blurb: () => 'Automation: advance minor stages and temper the body on your own', baseCost: 6, costGrowth: 1, maxLevel: 1 },
  { id: 'autobreak', name: 'Heaven-Sensing Instinct', blurb: () => 'Automation: attempt breakthroughs when the odds are good', baseCost: 25, costGrowth: 1, maxLevel: 1, requires: 'autoadvance' },
  { id: 'fatedmeeting', name: 'Fated Meeting', blurb: () => 'Choose which sect\'s elder finds you in each new life', baseCost: 8, costGrowth: 1, maxLevel: 1 },
  { id: 'unceasing', name: 'Unceasing Circulation', blurb: (l) => l === 0 ? 'Qi keeps flowing at 20% while you do chores, hunt or train' : `Qi flows at ${l * 20}% during other activities (next ${Math.min(100, (l + 1) * 20)}%)`, baseCost: 1500, costGrowth: 2.5, maxLevel: 5 },
  { id: 'seclusion', name: 'Deep Seclusion', blurb: (l) => `Bank up to ${8 + l * 4}h of seclusion (next ${8 + (l + 1) * 4}h)`, baseCost: 4, costGrowth: 2.5, maxLevel: 6 },
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
export interface Stats {
  attack: number;
  defense: number;
  vitality: number; // max health
  speed: number;
}

export interface HuntGround {
  id: string;
  name: string;
  beast: string;
  unlockRealm: number;
  stats: Stats;
  stones: number;
}

export const HUNT_GROUNDS: HuntGround[] = [
  { id: 'grove', name: 'Misty Bamboo Grove', beast: 'Iron-Bristle Boar', unlockRealm: 0, stats: { attack: 13, defense: 6, vitality: 90, speed: 10 }, stones: 18 },
  { id: 'ravine', name: 'Whispering Ravine', beast: 'Ravine Shadow Lynx', unlockRealm: 1, stats: { attack: 208, defense: 92.3, vitality: 1.38e03, speed: 30 }, stones: 108 },
  { id: 'plateau', name: 'Ashen Plateau', beast: 'Cinder-Wing Hawk', unlockRealm: 2, stats: { attack: 3.89e03, defense: 1.52e03, vitality: 2.53e04, speed: 60 }, stones: 540 },
  { id: 'palace', name: 'Drowned Palace', beast: 'Pearl-Eyed Serpent', unlockRealm: 3, stats: { attack: 4.83e04, defense: 1.87e04, vitality: 3.07e05, speed: 85 }, stones: 2700 },
  { id: 'peak', name: 'Thunderhead Peak', beast: 'Storm-Maned Qilin', unlockRealm: 4, stats: { attack: 5.71e05, defense: 2.14e05, vitality: 3.71e06, speed: 110 }, stones: 13500 },
];

// Player stats: a base that grows with every stage and realm, boosted by equipped manuals by element.
export const STAT_STAGE_GROWTH = 1.18;
export const STAT_REALM_MULT = 2;
export const ELEMENT_STATS: Record<Element, Partial<Record<keyof Stats, number>>> = {
  Fire: { attack: 1 },
  Metal: { attack: 0.5, defense: 0.5 },
  Earth: { defense: 1, vitality: 0.5 },
  Wood: { vitality: 1, defense: 0.25 },
  Water: { speed: 1, vitality: 0.25 },
};
export const STAT_NAMES: Record<keyof Stats, string> = { attack: 'Attack', defense: 'Defense', vitality: 'Vitality', speed: 'Speed' };

export const HUNT_RECOVER_S = 8;
export const HUNT_RESPAWN_S = 2; // a new beast appears this long after a kill
export const STRIKE_MULT = 2;
export const HUNT_STONE_MULT = 3; // hunting gives up qi, so a safe ground pays well above passive stones

// Body cultivation: a second path that tempers flesh and bone instead of gathering qi.
export const BODY_REALMS = ['Copper Skin', 'Iron Bone', 'Jade Marrow', 'Golden Blood', 'Diamond Body'];
export const BODY_LEVELS_PER_REALM = 9;
export const BODY_COST_BASE = 15;
export const BODY_COST_GROWTH = 1.7;
export const VIGOR_BASE = 0.6; // vigor per second of body training at the very start
export const VIGOR_STAGE_GROWTH = 1.5; // vigor rate grows with your qi cultivation stage
export const VIGOR_PER_KILL_SECONDS = 3; // a kill is worth this many seconds of vigor
export const VIGOR_TRAIN_SECONDS = 0.5; // one tap of Push harder while training
export const PHYSICAL_CHORE_VIGOR = 0.5; // physical chores also train the body at this share of the training rate
export const PHYSICAL_CHORES = ['water', 'gate', 'caravan'];
export const BODY_STAT_GROWTH = { attack: 1.05, defense: 1.06, vitality: 1.06, speed: 1.02 };
export const BODY_YEARS_PER_LEVEL = 1;
export const SECT_BODY_AFFINITY = [1, 1.5, 1.5]; // Crimson Furnace and Stoneheart favour the body path

export type Activity = 'meditate' | 'chores' | 'hunt' | 'train';
export const ACTIVITY_NAMES: Record<Activity, string> = { meditate: 'Meditating', chores: 'Doing chores', hunt: 'Hunting', train: 'Training the body' };
