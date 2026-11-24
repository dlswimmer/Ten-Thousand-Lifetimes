import { useCallback, useEffect, useRef, useState } from 'react';
import * as E from './game/engine';
import {
  ELEMENT_GLYPH, FINAL_REALM, HUNT_GROUNDS, SECTS, CHORES, PHYSICAL_CHORES, ACTIVITY_NAMES, type Activity, STAT_NAMES, type Stats, ELEMENT_STATS, KARMA_NODES, LONGEVITY_PILL_YEARS, MAX_BREAK_PILLS,
  MAX_LONGEVITY_PILLS, PILLS, REALMS, ROOT_GRADES, STAGES_PER_REALM, TECHNIQUES, TECH_MILESTONES,
  clarityPillCost, longevityPillCost,
} from './game/data';
import { fmt, fmtPct, fmtTime } from './game/format';

type Tab = 'cultivate' | 'techniques' | 'hunt' | 'elixirs' | 'karma';

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'cultivate', label: 'Cultivate', glyph: '氣' },
  { id: 'techniques', label: 'Sect', glyph: '宗' },
  { id: 'hunt', label: 'Hunt', glyph: '獵' },
  { id: 'elixirs', label: 'Elixirs', glyph: '丹' },
  { id: 'karma', label: 'Karma', glyph: '業' },
];

function load(): { state: E.GameState; offline: E.OfflineReport | null } {
  let state: E.GameState | null = null;
  try {
    const raw = localStorage.getItem(E.SAVE_KEY);
    if (raw) state = E.deserialize(raw);
  } catch { /* storage unavailable */ }
  if (!state) return { state: E.newGame(), offline: null };
  const offline = E.applyOffline(state);
  return { state, offline };
}

function save(s: E.GameState) {
  try {
    s.lastSeen = Date.now();
    localStorage.setItem(E.SAVE_KEY, E.serialize(s));
  } catch { /* storage unavailable */ }
}

interface Floater { id: number; x: number; y: number; text: string }

export default function App() {
  const initial = useRef<ReturnType<typeof load> | null>(null);
  if (!initial.current) initial.current = load();
  const stateRef = useRef<E.GameState>(initial.current.state);
  const [, setFrame] = useState(0);
  const [tab, setTab] = useState<Tab>('cultivate');
  const [offline, setOffline] = useState<E.OfflineReport | null>(initial.current.offline);
  const [confirmReincarnate, setConfirmReincarnate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterSeq = useRef(0);

  const s = stateRef.current;
  const rerender = useCallback(() => setFrame((f) => f + 1), []);
  const act = useCallback((fn: (st: E.GameState) => unknown) => { fn(stateRef.current); rerender(); }, [rerender]);

  // Game loop: 10 ticks a second. A long gap (app backgrounded) counts as seclusion.
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const st = stateRef.current;
      if (dt > 5) {
        st.lastSeen = Date.now() - dt * 1000;
        const rep = E.applyOffline(st);
        if (rep) setOffline(rep);
      } else {
        E.tick(st, dt);
      }
      st.lastSeen = Date.now();
      setFrame((f) => f + 1);
    }, 100);
    const saver = window.setInterval(() => save(stateRef.current), 5000);
    const onHide = () => { if (document.visibilityState === 'hidden') save(stateRef.current); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(id);
      window.clearInterval(saver);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const onCirculate = (e: React.PointerEvent) => {
    if (stateRef.current.activity !== 'meditate') { act((x) => E.setActivity(x, 'meditate')); return; }
    const gain = Math.max(1, E.qps(stateRef.current));
    act(E.circulate);
    const rect = ((e.currentTarget as HTMLElement).parentElement ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    const fid = ++floaterSeq.current;
    const f = { id: fid, x: e.clientX - rect.left + (Math.random() * 30 - 15), y: e.clientY - rect.top, text: `+${fmt(gain)}` };
    setFloaters((list) => [...list.slice(-8), f]);
    window.setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== fid)), 900);
  };

  const visibleTabs = TABS.filter((t) => s.unlocked.includes(t.id));
  const current: Tab = s.unlocked.includes(tab) ? tab : 'cultivate';
  const span = E.lifespan(s);
  const agePct = Math.min(1, (s.age - 16) / Math.max(1, span - 16));
  const yearsLeft = Math.max(0, span - s.age);

  return (
    <div className="app">
      <header className="top">
        <div className="top-row">
          <div>
            <div className="realm">{s.sect === null ? 'Mortal' : REALMS[s.realm].name}</div>
            <div className="sub">{s.sect === null ? `Willowford village · Life ${s.lives}` : `Stage ${s.stage} of ${STAGES_PER_REALM} · ${E.sectRank(s)}, ${SECTS[s.sect].name}`}</div>
          </div>
          <div className="top-right">
            <button className="root-badge" title="Spiritual root" onClick={() => setShowMenu(true)}>
              <span className="glyph">{ELEMENT_GLYPH[s.root.element]}</span>
              <span>{E.rootLabel(s)}</span>
            </button>
          </div>
        </div>
        <div className="life">
          <div className="life-label">
            <span>Age {Math.floor(s.age)} of {Math.floor(span)}</span>
            <span className="muted">{Math.floor(yearsLeft)} years left</span>
          </div>
          <div className="bar thin"><div className="fill life-fill" style={{ width: `${agePct * 100}%` }} /></div>
        </div>
        <div className="purse">
          {s.sect !== null && <span className="chip"><span className="dot stone" />{fmt(s.stones)} stones <span className="muted">+{fmt(E.stonesPerSec(s))}/s</span></span>}
          {s.sect !== null && <span className="chip"><span className="dot contrib" />{fmt(s.contribution)} contribution</span>}
          {s.insight > 0 && <span className="chip"><span className="dot insight" />{fmt(s.insight)} insight</span>}
          {s.unlocked.includes('karma') && <span className="chip"><span className="dot karma" />{fmt(s.karma)} karma</span>}
        </div>
      </header>

      <main className="content">
        {current === 'cultivate' && (s.sect === null
          ? <Encounter s={s} act={act} />
          : <Cultivate s={s} act={act} onCirculate={onCirculate} floaters={floaters} />)}
        {current !== 'cultivate' && current !== 'karma' && s.sect === null && (
          <section className="empty">
            <h2 className="section-title">You are still a mortal</h2>
            <p className="muted">Only sect disciples are taught to cultivate. Someone is coming for you.</p>
            <button className="btn primary" onClick={() => setTab('cultivate')}>Return to the village</button>
          </section>
        )}
        {current === 'techniques' && s.sect !== null && <><Chores s={s} act={act} /><Techniques s={s} act={act} /></>}
        {current === 'hunt' && s.sect !== null && <Hunt s={s} act={act} />}
        {current === 'elixirs' && s.sect !== null && <Elixirs s={s} act={act} />}
        {current === 'karma' && <Karma s={s} act={act} onReincarnate={() => setConfirmReincarnate(true)} />}
      </main>

      {visibleTabs.length > 1 && (
        <nav className="tabs" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
          {visibleTabs.map((t) => (
            <button key={t.id} className={`tab ${current === t.id ? 'on' : ''}`} onClick={() => { setTab(t.id); act((x) => E.markSeen(x, t.id)); }}>
              <span className="tab-glyph">{t.glyph}{s.unseen.includes(t.id) && <span className="new-dot" aria-label="new" />}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {offline && (
        <Modal onClose={() => setOffline(null)}>
          <h2>You emerge from seclusion</h2>
          <p className="muted">You meditated for {fmtTime(offline.seconds)}. Time does not touch you in seclusion: you did not age.</p>
          <ul className="report">
            <li><b>{fmt(offline.qi)}</b> qi gathered</li>
            <li><b>{fmt(offline.stones)}</b> spirit stones</li>
            {offline.stagesGained > 0 && <li><b>{offline.stagesGained}</b> stages advanced{offline.realmsGained > 0 ? `, ${offline.realmsGained} realm breakthrough${offline.realmsGained > 1 ? 's' : ''}` : ''}</li>}
            {offline.kills > 0 && <li><b>{offline.kills}</b> beasts slain</li>}
          </ul>
          <button className="btn primary wide" onClick={() => setOffline(null)}>Continue</button>
        </Modal>
      )}

      {confirmReincarnate && !s.passing && (
        <Modal onClose={() => setConfirmReincarnate(false)}>
          <h2>Enter the cycle of rebirth?</h2>
          <p>You will be reborn as a mortal with <b>{E.karmaForLife(s)} Karma</b>. That is exactly what you would receive if this life ran its natural course, so there is no penalty for waiting or for going now.</p>
          <p className="muted">Kept: Karma, Karma upgrades, {Math.round(100 * (0.1 + 0.15 * E.k(s, 'memories')))}% of manual mastery. Reset: realm, sect membership, manuals, qi, stones, contribution, pills.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirmReincarnate(false)}>Stay</button>
            <button className="btn karma" onClick={() => { act((st) => E.endLife(st, true)); setConfirmReincarnate(false); }}>Reincarnate</button>
          </div>
        </Modal>
      )}

      {s.passing && (
        <Modal>
          <h2>{s.passing.voluntary ? 'You let go of this life' : 'A peaceful passing'}</h2>
          <p>
            {s.passing.voluntary
              ? 'Your soul slips free and drifts toward the cycle of rebirth.'
              : `At ${Math.floor(s.age)}, your lifespan is spent. You pass quietly, nothing lost, and your soul carries every lesson forward.`}
          </p>
          <div className="big-karma">+{s.passing.karma} Karma</div>
          <p className="muted center">Reached {REALMS[s.passing.realm].name}, stage {s.passing.stage}. Spend Karma in the Karma tab to make every life stronger.</p>
          <button className="btn karma wide" onClick={() => { act(E.beginNextLife); setTab('karma'); }}>Be reborn</button>
          <p className="small muted center">In your next life an elder will find you again. Your mastery of past manuals partly carries over.</p>
        </Modal>
      )}

      {showMenu && (
        <Menu s={s} onClose={() => setShowMenu(false)} onReplace={(next) => { stateRef.current = next; save(next); setShowMenu(false); rerender(); }} />
      )}
    </div>
  );
}

type ActFn = (fn: (st: E.GameState) => unknown) => void;

function Cultivate({ s, act, onCirculate, floaters }: { s: E.GameState; act: ActFn; onCirculate: (e: React.PointerEvent) => void; floaters: Floater[] }) {
  const req = E.stageReq(s);
  const pct = Math.min(1, s.qi / req);
  const bottleneck = E.atBottleneck(s);
  const sealed = E.sealedAtTop(s);
  const ready = E.canAdvance(s);
  const chance = E.breakChance(s);
  const meditating = s.activity === 'meditate';
  const rate = E.qps(s) * E.qiShare(s);
  const eta = ready ? 0 : rate > 0 ? (req - s.qi) / rate : Infinity;
  return (
    <section className="cultivate">
      <ActivityBar s={s} act={act} />

      <div className="qi-readout">
        <div className="qi-number">{fmt(s.qi)}</div>
        <div className="muted">qi · +{fmt(rate)} per second{!meditating && E.qiShare(s) === 0 ? ' · not meditating' : ''}{s.heartDemon > 0 && <span className="demon"> · heart demon {Math.ceil(s.heartDemon)}s</span>}</div>
      </div>

      <div className="orb-wrap">
        <button className={`orb ${meditating ? '' : 'resting'}`} onPointerDown={onCirculate} aria-label={meditating ? 'Circulate qi' : 'Meditate'}>
          <svg viewBox="0 0 200 200" className="orb-svg" aria-hidden="true">
            <circle cx="100" cy="100" r="92" className="orb-ring" />
            <circle cx="100" cy="100" r="92" className="orb-progress" style={{ strokeDasharray: `${pct * 578} 578` }} />
            <path className="orb-swirl" d="M100 30 a70 70 0 0 1 0 140 a35 35 0 0 1 0 -70 a35 35 0 0 0 0 -70" />
            <circle cx="100" cy="65" r="9" className="orb-dot-dark" />
            <circle cx="100" cy="135" r="9" className="orb-dot-light" />
          </svg>
          <span className="orb-label">{meditating ? 'Circulate' : 'Meditate'}</span>
        </button>
        {floaters.map((f) => (
          <span key={f.id} className="floater" style={{ left: f.x, top: f.y }}>{f.text}</span>
        ))}
      </div>

      <div className="stage-bar">
        <div className="bar"><div className={`fill ${bottleneck ? 'gold' : ''}`} style={{ width: `${pct * 100}%` }} /></div>
        <div className="bar-label"><span>{fmt(s.qi)} / {fmt(req)}</span><span className="muted">{ready ? 'ready' : isFinite(eta) ? `~${fmtTime(eta)}` : 'meditate to fill'}</span></div>
      </div>

      {sealed ? (
        <div className="sealed">
          <b>The path beyond Nascent Soul is sealed.</b>
          <span>Ascension arrives in a later build. Keep strengthening lives through Karma, or reincarnate to try new spiritual roots.</span>
        </div>
      ) : bottleneck ? (
        <button className="btn gold wide big" disabled={!ready} onClick={() => act(E.attemptBreakthrough)}>
          Attempt breakthrough to {REALMS[s.realm + 1].name} · {fmtPct(chance)}
        </button>
      ) : (
        <button className="btn primary wide big" disabled={!ready} onClick={() => act(E.advance)}>
          Advance to stage {s.stage + 1}
        </button>
      )}

      {bottleneck && !sealed && (
        <div className="odds">
          <span>Base {fmtPct(REALMS[s.realm].breakChance)}</span>
          {E.k(s, 'daoheart') > 0 && <span>Dao heart +{E.k(s, 'daoheart') * 6}%</span>}
          {s.clarityPills > 0 && <span>Pills +{s.clarityPills * 12}%</span>}
          {s.insight > 0 && <span>Insight +{fmtPct(E.insightBonus(s))}</span>}
          <span className="muted">Failure costs half your qi but grants Insight.</span>
        </div>
      )}

      {(s.stage >= 2 || s.realm > 0 || s.body.level > 0) && <BodyPanel s={s} act={act} />}

      <Automation s={s} act={act} />

      <StatStrip stats={E.playerStats(s)} />

      <p className="flavor">{REALMS[s.realm].blurb}</p>

      <div className="log">
        {s.log.slice(0, 8).map((l) => <div key={l.id} className={`log-line ${l.kind}`}>{l.text}</div>)}
      </div>
    </section>
  );
}

function ActivityBar({ s, act }: { s: E.GameState; act: ActFn }) {
  const options: Activity[] = ['meditate'];
  if (s.unlocked.includes('techniques')) options.push('chores');
  if (s.unlocked.includes('hunt')) options.push('hunt');
  if (s.stage >= 2 || s.realm > 0 || s.body.level > 0) options.push('train');
  const share = E.qiShare(s);
  const label: Record<Activity, string> = { meditate: 'Meditate', chores: 'Chores', hunt: 'Hunt', train: 'Train body' };
  return (
    <div className="activity">
      {options.length > 1 && (
        <div className="segmented" role="group" aria-label="Activity">
          {options.map((a) => (
            <button key={a} className={s.activity === a ? 'on' : ''} onClick={() => act((x) => E.setActivity(x, a))}>{label[a]}</button>
          ))}
        </div>
      )}
      <span className="small muted">
        {ACTIVITY_NAMES[s.activity]}.{' '}
        {s.activity === 'meditate'
          ? 'Qi flows and your manuals gain mastery.'
          : share > 0 ? `Qi still flows at ${Math.round(share * 100)}% thanks to Unceasing Circulation.` : 'Qi does not flow until you return to meditation.'}
      </span>
    </div>
  );
}

function BodyPanel({ s, act }: { s: E.GameState; act: ActFn }) {
  const cost = E.bodyCost(s);
  const capped = s.body.level >= E.bodyCap(s);
  const pct = capped ? 1 : Math.min(1, s.body.vigor / cost);
  const rate = E.currentVigorRate(s);
  const training = s.activity === 'train';
  return (
    <div className="body-panel">
      <div className="card-head">
        <div className="card-title">
          <b>Body cultivation · {E.bodyRealmName(s.body.level)}</b>
          <span className="small muted">Tempering raises attack, defense and vitality, and adds a year of life per level.</span>
        </div>
        {training
          ? <button className="btn small primary" onClick={() => act(E.trainBody)}>Push harder</button>
          : <button className="btn small" onClick={() => act((x) => E.setActivity(x, 'train'))}>Start training</button>}
      </div>
      <div className="bar"><div className="fill body" style={{ width: `${pct * 100}%` }} /></div>
      <div className="bar-label">
        <span>{fmt(s.body.vigor)} / {fmt(cost)} vigor · {rate > 0 ? `+${fmt(rate)}/s` : 'train or do physical chores to gain vigor'}</span>
        {capped
          ? <span className="muted">Your qi realm limits the body here</span>
          : <button className="btn small gold" disabled={!E.canTemper(s)} onClick={() => act(E.temperBody)}>Temper</button>}
      </div>
    </div>
  );
}

function Automation({ s, act }: { s: E.GameState; act: ActFn }) {
  const hasAdv = E.k(s, 'autoadvance') > 0;
  const hasBreak = E.k(s, 'autobreak') > 0;
  if (!hasAdv && !hasBreak) return null;
  return (
    <div className="auto">
      {hasAdv && (
        <label className="toggle"><input type="checkbox" checked={s.autoAdvance} onChange={(e) => act((st) => { st.autoAdvance = e.target.checked; })} /> Auto-advance stages</label>
      )}
      {hasBreak && (
        <label className="toggle">
          <input type="checkbox" checked={s.autoBreak} onChange={(e) => act((st) => { st.autoBreak = e.target.checked; })} /> Auto-breakthrough at ≥
          <select value={s.autoBreakMin} onChange={(e) => act((st) => { st.autoBreakMin = Number(e.target.value); })}>
            {[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((v) => <option key={v} value={v}>{fmtPct(v)}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function Encounter({ s, act }: { s: E.GameState; act: ActFn }) {
  const choose = E.k(s, 'fatedmeeting') > 0;
  const shown = choose ? SECTS.map((_, i) => i) : [s.fatedSect];
  return (
    <section className="encounter">
      <h2 className="section-title">{s.lives === 1 ? 'An elder at the village well' : 'Found again'}</h2>
      <p className="muted">{s.lives === 1
        ? 'You are sixteen and have spent your whole life in Willowford, hauling water and splitting wood. Nobody here can sense qi. Today a stranger can.'
        : choose
          ? 'Your fated meeting draws more than one elder to the village. Choose whose sect you will follow in this life.'
          : 'Sixteen years after your rebirth, another stranger arrives in the village and stops in front of you.'}
      </p>
      {shown.map((i) => {
        const sect = SECTS[i];
        const library = TECHNIQUES.filter((t) => t.sect === i);
        const matches = library.filter((t) => t.element === s.root.element).length;
        return (
          <div key={sect.name} className="card elder-card">
            <div className="card-title">
              <b className="elder-name">{sect.elder}</b>
              <span className="small muted">{sect.name} · <i>{sect.motto}</i></span>
            </div>
            <p className="speech">{sect.greeting}</p>
            <div className="small"><span className="tag">{sect.bonus}</span></div>
            <div className="elements">
              {library.map((t) => (
                <span key={t.id} title={t.name} className={`elem tiny elem-${t.element.toLowerCase()} ${t.element === s.root.element ? 'match' : ''}`}>{ELEMENT_GLYPH[t.element]}</span>
              ))}
              <span className="small muted">{matches ? `${matches} of its 6 manuals suit your ${s.root.element} root` : `None of its manuals suit your ${s.root.element} root`}</span>
            </div>
            <button className="btn primary" onClick={() => act((x) => E.joinSect(x, i))}>Follow {sect.elder}</button>
          </div>
        );
      })}
      {!choose && <p className="small muted">The Karma upgrade Fated Meeting lets you choose which elder finds you in later lives. You do not age until you leave the village.</p>}
    </section>
  );
}

function stageLabel(g: number): string {
  const r = Math.min(REALMS.length - 1, Math.floor(g / STAGES_PER_REALM));
  return `${REALMS[r].name} ${g - r * STAGES_PER_REALM + 1}`;
}

function ChoreNeedLine({ s, i }: { s: E.GameState; i: number }) {
  const n = E.choreNeed(s, i);
  if (!n) return <span className="small muted chore-need">No requirement · normal speed</span>;
  const verb = n.hard ? 'Requires' : 'Needs';
  const label = n.stat === 'cultivation'
    ? `${verb} ${stageLabel(n.need)} · you are ${stageLabel(n.have)}`
    : `${verb} ${fmt(n.need)} ${STAT_NAMES[n.stat as keyof Stats]} · you have ${fmt(n.have)}`;
  if (n.hard && !n.met) return <span className="small chore-need behind">{label} · <b>locked</b></span>;
  return <span className={`small chore-need ${n.speed >= 1 ? 'ahead' : 'behind'}`}>{label} · <b>{n.speed.toFixed(2)}x speed</b></span>;
}

function Chores({ s, act }: { s: E.GameState; act: ActFn }) {
  const current = CHORES.findIndex((c) => c.id === s.chore.id);
  return (
    <section>
      <h2 className="section-title">Chores</h2>
      <p className="muted small">Every disciple works for the sect. Chores repeat on their own, even in seclusion, and pay sect contribution. Tap Work hard to finish faster. Longer chores pay better. Most chores lean on one stat. Basic chores go slowly below it; better chores cannot be taken until you meet it. Well above it, any chore goes up to twice as fast.</p>
      {current >= 0 && (
        <div className="chore-now">
          <div className="card-head">
            <div className="card-title">
              <b>{CHORES[current].name}</b>
              <span className="small muted">+{fmt(E.choreReward(s, current))} contribution each time · done {s.chore.done} times</span>
            </div>
            {s.activity === 'chores'
              ? <button className="btn small primary" onClick={() => act(E.workHard)}>Work hard</button>
              : <button className="btn small" onClick={() => act((x) => E.setActivity(x, 'chores'))}>Resume chores</button>}
          </div>
          <div className="bar"><div className="fill" style={{ width: `${(s.chore.progress / CHORES[current].seconds) * 100}%` }} /></div>
          <span className="small muted">{CHORES[current].blurb}</span>
          <ChoreNeedLine s={s} i={current} />
        </div>
      )}
      <div className="chore-list">
        {CHORES.map((c, i) => {
          if (c.unlockRealm > s.realm + 1) return null;
          const rankLocked = c.unlockRealm > s.realm;
          const locked = !E.canDoChore(s, i);
          const on = i === current;
          return (
            <div key={c.id} className={`chore-row ${on ? 'on' : ''} ${locked ? 'locked' : ''}`}>
              <div className="chore-info">
                <b className="small">{c.name}</b>
                <span className="small muted">{rankLocked ? `Requires rank: ${E.sectRank({ ...s, realm: c.unlockRealm })}` : locked ? `${fmtTime(c.seconds)} once you meet the requirement` : `${fmtTime(c.seconds / E.choreSpeed(s, i))} · ${fmt(E.choreRate(s, i) * 60)} contribution per minute${PHYSICAL_CHORES.includes(c.id) ? ' · trains the body' : ''}`}</span>
                <ChoreNeedLine s={s} i={i} />
              </div>
              {!locked && !on && <button className="btn small" onClick={() => act((x) => E.setChore(x, c.id))}>Do this</button>}
              {on && <span className="small" style={{ color: 'var(--jade)' }}>Working</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatStrip({ stats, compare }: { stats: Stats; compare?: Stats }) {
  const keys = Object.keys(STAT_NAMES) as (keyof Stats)[];
  return (
    <div className="stats">
      {keys.map((key) => {
        const mine = stats[key];
        const theirs = compare?.[key];
        const cls = theirs === undefined ? '' : mine >= theirs ? 'ahead' : 'behind';
        return (
          <div key={key} className={`stat ${cls}`}>
            <span className="stat-name">{STAT_NAMES[key]}</span>
            <span className="stat-val">{fmt(mine)}</span>
            {theirs !== undefined && <span className="stat-vs">vs {fmt(theirs)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function statHint(element: keyof typeof ELEMENT_STATS): string {
  const shares = ELEMENT_STATS[element];
  return (Object.keys(shares) as (keyof Stats)[]).map((k) => STAT_NAMES[k]).join(' and ');
}

function Techniques({ s, act }: { s: E.GameState; act: ActFn }) {
  const sect = s.sect!;
  return (
    <section>
      <h2 className="section-title">Scripture Pavilion</h2>
      <p className="muted small">The {SECTS[sect].name} grants manuals for sect contribution, which you earn from chores and hunts. Higher manuals need a higher rank. Equipped manuals generate qi, gain mastery and raise your stats. Slots: {s.equipped.length} of {E.slots(s)}.</p>
      <div className="cards">
        {TECHNIQUES.map((t, i) => {
          if (t.sect !== sect) return null;
          const st = s.techs[i];
          const rankLocked = t.unlockRealm > s.realm;
          const cost = E.techCost(s, i);
          const equipped = s.equipped.includes(i);
          const nextMilestone = TECH_MILESTONES.find((m) => m > st.lvl);
          const mastery = E.masteryLevel(st.masteryXp);
          return (
            <div key={t.id} className={`card ${equipped ? 'equipped' : ''} ${rankLocked ? 'locked' : ''}`}>
              <div className="card-head">
                <span className={`elem elem-${t.element.toLowerCase()}`}>{ELEMENT_GLYPH[t.element]}</span>
                <div className="card-title">
                  <b>{t.name}</b>
                  <span className="small muted">
                    {st.owned ? `Level ${st.lvl} · mastery ${mastery}` : rankLocked ? `Requires rank: ${E.sectRank({ ...s, realm: t.unlockRealm })}` : 'Not yet granted'}
                    {t.element === s.root.element ? ' · root match' : ''}
                  </span>
                </div>
              </div>
              <p className="small muted">{t.blurb} Raises {statHint(t.element)}.</p>
              {st.owned ? (
                <div className="card-foot">
                  <span className="small">{fmt(E.techQps(s, i))} base qi/s{nextMilestone ? ` · x2 at level ${nextMilestone}` : ''}</span>
                  <div className="row">
                    <button className={`btn small ${equipped ? 'on' : ''}`} onClick={() => act((x) => E.toggleEquip(x, i))}>{equipped ? 'Equipped' : 'Equip'}</button>
                    <button className="btn small primary" disabled={s.stones < cost} onClick={() => act((x) => E.buyTech(x, i))}>Train · {fmt(cost)} stones</button>
                  </div>
                </div>
              ) : !rankLocked && (
                <div className="card-foot">
                  <span className="small">{fmt(t.baseQps)} qi/s per level</span>
                  <button className="btn small contrib" disabled={!E.canObtainManual(s, i)} onClick={() => act((x) => E.obtainManual(x, i))}>Request · {fmt(t.manualCost)} contribution</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Hunt({ s, act }: { s: E.GameState; act: ActFn }) {
  const h = s.hunt;
  const me = E.playerStats(s);
  return (
    <section>
      <h2 className="section-title">Beast hunts</h2>
      <p className="muted small">Your cultivator fights on their own for spirit stones and sect contribution. Compare your stats with each beast before you go. If a beast is too strong you retreat and rest. Nothing is lost.</p>
      <h3 className="mini-title">Your stats</h3>
      <StatStrip stats={me} />
      {h.ground !== null && (
        <div className="battle">
          <div className="fighter">
            <b>You</b>
            <div className="bar thin"><div className="fill hp" style={{ width: `${Math.max(0, h.playerHp / me.vitality) * 100}%` }} /></div>
            <span className="small muted">{h.recover > 0 ? `Resting ${Math.ceil(h.recover)}s` : `${fmt(Math.max(0, h.playerHp))} / ${fmt(me.vitality)} vitality · ${fmt(E.damagePerSec(me, HUNT_GROUNDS[h.ground].stats))} damage/s`}</span>
          </div>
          <div className="vs">vs</div>
          <div className="fighter">
            <b>{HUNT_GROUNDS[h.ground].beast}</b>
            <div className="bar thin"><div className="fill enemy" style={{ width: `${h.respawn > 0 ? 0 : Math.max(0, h.beastHp / HUNT_GROUNDS[h.ground].stats.vitality) * 100}%` }} /></div>
            <span className="small muted">{h.respawn > 0 ? 'Tracking the next beast…' : `${fmt(Math.max(0, h.beastHp))} vitality · ${fmt(E.damagePerSec(HUNT_GROUNDS[h.ground].stats, me))} damage/s`}</span>
          </div>
          <div className="row">
            <button className="btn primary" disabled={h.recover > 0 || h.respawn > 0} onClick={() => act(E.strike)}>Strike</button>
            <button className="btn" onClick={() => act((x) => E.setHunt(x, null))}>Return home</button>
          </div>
          <div className="small muted">{h.kills} beasts slain this life</div>
        </div>
      )}
      <div className="cards">
        {HUNT_GROUNDS.map((g, i) => {
          if (g.unlockRealm > s.realm + 1) return null;
          const locked = g.unlockRealm > s.realm;
          const m = E.matchup(s, i);
          return (
            <div key={g.id} className={`card ${locked ? 'locked' : ''} ${h.ground === i ? 'equipped' : ''}`}>
              <div className="card-head">
                <div className="card-title">
                  <b>{g.name}</b>
                  <span className="small muted">{locked ? `Opens at ${REALMS[g.unlockRealm].name}` : `${g.beast} · ${fmt(g.stones * Math.pow(1.5, E.k(s, 'vein')))} stones each`}</span>
                </div>
                {!locked && <span className={`verdict v-${m.verdict.split(' ')[0].toLowerCase()}`}>{m.verdict}</span>}
              </div>
              {!locked && (
                <>
                  <StatStrip stats={me} compare={g.stats} />
                  <span className="small muted">You would win in about {fmtTime(Math.max(1, m.killTime))}{isFinite(m.surviveTime) ? ` and can last about ${fmtTime(m.surviveTime)}` : ', and it cannot wear you down'}.</span>
                  {h.ground !== i && <button className="btn small" onClick={() => act((x) => E.setHunt(x, i))}>Hunt here</button>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Elixirs({ s, act }: { s: E.GameState; act: ActFn }) {
  const clarityCost = clarityPillCost(s.realm) * E.elixirMult(s);
  const longCost = longevityPillCost(s.realm, s.longevityUsed) * E.elixirMult(s);
  return (
    <section>
      <h2 className="section-title">Elixir pavilion</h2>
      <p className="muted small">Pills bought from a travelling alchemist. Brewing your own arrives with the alchemy update.</p>
      <div className="cards">
        <div className="card">
          <div className="card-title"><b>{PILLS[0].name}</b><span className="small muted">Held {s.clarityPills} of {MAX_BREAK_PILLS}</span></div>
          <p className="small muted">{PILLS[0].blurb}</p>
          <button className="btn small primary" disabled={s.stones < clarityCost || s.clarityPills >= MAX_BREAK_PILLS} onClick={() => act(E.buyClarity)}>Buy · {fmt(clarityCost)}</button>
        </div>
        <div className="card">
          <div className="card-title"><b>{PILLS[1].name}</b><span className="small muted">Taken {s.longevityUsed} of {MAX_LONGEVITY_PILLS} this life</span></div>
          <p className="small muted">{PILLS[1].blurb}</p>
          <button className="btn small primary" disabled={s.stones < longCost || s.longevityUsed >= MAX_LONGEVITY_PILLS} onClick={() => act(E.buyLongevity)}>Take · +{LONGEVITY_PILL_YEARS} years · {fmt(longCost)}</button>
        </div>
      </div>
    </section>
  );
}

function Karma({ s, act, onReincarnate }: { s: E.GameState; act: ActFn; onReincarnate: () => void }) {
  const gain = E.karmaForLife(s);
  return (
    <section>
      <h2 className="section-title">Karma</h2>
      <div className="karma-panel">
        <div>
          <div className="big-karma small-big">{fmt(s.karma)}</div>
          <div className="muted small">Karma to spend · {fmt(s.karmaEarned)} earned over {s.lives} li{s.lives === 1 ? 'fe' : 'ves'}</div>
        </div>
        <button className="btn karma" disabled={!E.canReincarnate(s)} onClick={onReincarnate}>
          {E.canReincarnate(s) ? `Reincarnate · +${gain}` : 'Reach Qi Gathering'}
        </button>
      </div>
      <p className="muted small">Karma depends only on how far you got, never on when you leave. A life that ends naturally gives the same reward.</p>
      <div className="cards">
        {KARMA_NODES.map((n) => {
          const lvl = E.k(s, n.id);
          const maxed = lvl >= n.maxLevel;
          const blocked = n.requires && E.k(s, n.requires) === 0;
          const cost = E.karmaCost(s, n.id);
          return (
            <div key={n.id} className={`card ${maxed ? 'equipped' : ''} ${blocked ? 'locked' : ''}`}>
              <div className="card-head">
                <div className="card-title">
                  <b>{n.name}</b>
                  <span className="small muted">{n.maxLevel > 1 ? `Level ${lvl} of ${n.maxLevel}` : lvl ? 'Unlocked' : 'Not unlocked'}</span>
                </div>
                <button className="btn small karma" disabled={maxed || !!blocked || s.karma < cost} onClick={() => act((x) => E.buyKarma(x, n.id))}>
                  {maxed ? 'Max' : `${fmt(cost)}`}
                </button>
              </div>
              <p className="small muted">{blocked ? `Requires ${KARMA_NODES.find((x) => x.id === n.requires)!.name}` : n.blurb(lvl)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Menu({ s, onClose, onReplace }: { s: E.GameState; onClose: () => void; onReplace: (st: E.GameState) => void }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [armReset, setArmReset] = useState(false);
  const grade = ROOT_GRADES[s.root.grade];
  return (
    <Modal onClose={onClose}>
      <h2>Spiritual root</h2>
      <p><b>{E.rootLabel(s)}</b>: all qi x{grade.mult}, {s.root.element} arts x1.6. A new root is rolled each life. Fated Root in the Karma tab improves the odds.</p>
      <h2>Save</h2>
      <p className="muted small">The game saves itself every few seconds. Copy this text to move your save to another device.</p>
      <div className="row">
        <button className="btn small" onClick={() => { const t = E.serialize(s); setText(t); navigator.clipboard?.writeText(t).then(() => setMsg('Copied to clipboard.'), () => setMsg('Select and copy the text below.')); }}>Export</button>
        <button className="btn small" onClick={() => { const next = E.deserialize(text); if (next) onReplace(next); else setMsg('That save text could not be read.'); }}>Import</button>
        <button className="btn small danger" onClick={() => { if (armReset) onReplace(E.newGame()); else { setArmReset(true); setMsg('Tap "Erase everything" to confirm. This cannot be undone.'); } }}>{armReset ? 'Erase everything' : 'Hard reset'}</button>
      </div>
      <textarea className="save-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a save here to import" rows={3} />
      {msg && <p className="small muted">{msg}</p>}
      <p className="small muted">Prototype build · realms up to {REALMS[FINAL_REALM].name} · played {fmtTime(s.playSeconds)}</p>
      <button className="btn wide" onClick={onClose}>Close</button>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
