import { useCallback, useEffect, useRef, useState } from 'react';
import * as E from './game/engine';
import {
  ELEMENT_GLYPH, FINAL_REALM, HUNT_GROUNDS, KARMA_NODES, LONGEVITY_PILL_YEARS, MAX_BREAK_PILLS,
  MAX_LONGEVITY_PILLS, PILLS, REALMS, ROOT_GRADES, STAGES_PER_REALM, TECHNIQUES, TECH_MILESTONES,
  clarityPillCost, longevityPillCost,
} from './game/data';
import { fmt, fmtPct, fmtTime } from './game/format';

type Tab = 'cultivate' | 'techniques' | 'hunt' | 'elixirs' | 'karma';

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'cultivate', label: 'Cultivate', glyph: '氣' },
  { id: 'techniques', label: 'Arts', glyph: '經' },
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
    const gain = Math.max(1, E.qps(stateRef.current));
    act(E.circulate);
    const rect = ((e.currentTarget as HTMLElement).parentElement ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    const fid = ++floaterSeq.current;
    const f = { id: fid, x: e.clientX - rect.left + (Math.random() * 30 - 15), y: e.clientY - rect.top, text: `+${fmt(gain)}` };
    setFloaters((list) => [...list.slice(-8), f]);
    window.setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== fid)), 900);
  };

  const span = E.lifespan(s);
  const agePct = Math.min(1, (s.age - 16) / Math.max(1, span - 16));
  const yearsLeft = Math.max(0, span - s.age);

  return (
    <div className="app">
      <header className="top">
        <div className="top-row">
          <div>
            <div className="realm">{REALMS[s.realm].name}</div>
            <div className="sub">Stage {s.stage} of {STAGES_PER_REALM} · Life {s.lives}</div>
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
          <span className="chip"><span className="dot stone" />{fmt(s.stones)} stones <span className="muted">+{fmt(E.stonesPerSec(s))}/s</span></span>
          <span className="chip"><span className="dot insight" />{fmt(s.insight)} insight</span>
          <span className="chip"><span className="dot karma" />{fmt(s.karma)} karma</span>
        </div>
      </header>

      <main className="content">
        {tab === 'cultivate' && <Cultivate s={s} act={act} onCirculate={onCirculate} floaters={floaters} />}
        {tab === 'techniques' && <Techniques s={s} act={act} />}
        {tab === 'hunt' && <Hunt s={s} act={act} />}
        {tab === 'elixirs' && <Elixirs s={s} act={act} />}
        {tab === 'karma' && <Karma s={s} act={act} onReincarnate={() => setConfirmReincarnate(true)} />}
      </main>

      <nav className="tabs">
        {TABS.map((t) => {
          const locked = t.id === 'hunt' && s.realm < 0;
          return (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} disabled={locked} onClick={() => setTab(t.id)}>
              <span className="tab-glyph">{t.glyph}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </nav>

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
          <p>You will be reborn at Body Tempering with <b>{E.karmaForLife(s)} Karma</b>. That is exactly what you would receive if this life ran its natural course, so there is no penalty for waiting or for going now.</p>
          <p className="muted">Kept: Karma, Karma upgrades, {Math.round(100 * (0.1 + 0.15 * E.k(s, 'memories')))}% of technique mastery. Reset: realm, qi, stones, technique levels, pills.</p>
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
  const rate = E.qps(s);
  const eta = ready ? 0 : (req - s.qi) / Math.max(rate, 1e-9);
  return (
    <section className="cultivate">
      <div className="qi-readout">
        <div className="qi-number">{fmt(s.qi)}</div>
        <div className="muted">qi · +{fmt(rate)} per second{s.heartDemon > 0 && <span className="demon"> · heart demon {Math.ceil(s.heartDemon)}s</span>}</div>
      </div>

      <div className="orb-wrap">
        <button className="orb" onPointerDown={onCirculate} aria-label="Circulate qi">
          <svg viewBox="0 0 200 200" className="orb-svg" aria-hidden="true">
            <circle cx="100" cy="100" r="92" className="orb-ring" />
            <circle cx="100" cy="100" r="92" className="orb-progress" style={{ strokeDasharray: `${pct * 578} 578` }} />
            <path className="orb-swirl" d="M100 30 a70 70 0 0 1 0 140 a35 35 0 0 1 0 -70 a35 35 0 0 0 0 -70" />
            <circle cx="100" cy="65" r="9" className="orb-dot-dark" />
            <circle cx="100" cy="135" r="9" className="orb-dot-light" />
          </svg>
          <span className="orb-label">Circulate</span>
        </button>
        {floaters.map((f) => (
          <span key={f.id} className="floater" style={{ left: f.x, top: f.y }}>{f.text}</span>
        ))}
      </div>

      <div className="stage-bar">
        <div className="bar"><div className={`fill ${bottleneck ? 'gold' : ''}`} style={{ width: `${pct * 100}%` }} /></div>
        <div className="bar-label"><span>{fmt(s.qi)} / {fmt(req)}</span><span className="muted">{ready ? 'ready' : `~${fmtTime(eta)}`}</span></div>
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

      <Automation s={s} act={act} />

      <p className="flavor">{REALMS[s.realm].blurb}</p>

      <div className="log">
        {s.log.slice(0, 8).map((l) => <div key={l.id} className={`log-line ${l.kind}`}>{l.text}</div>)}
      </div>
    </section>
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

function Techniques({ s, act }: { s: E.GameState; act: ActFn }) {
  return (
    <section>
      <h2 className="section-title">Cultivation arts</h2>
      <p className="muted small">Equipped arts generate qi and gain mastery. Slots: {s.equipped.length} of {E.slots(s)} (more open at Qi Gathering and Golden Core). Arts matching your {s.root.element} root are 60% stronger.</p>
      <div className="cards">
        {TECHNIQUES.map((t, i) => {
          const st = s.techs[i];
          const locked = t.unlockRealm > s.realm;
          if (locked && t.unlockRealm > s.realm + 1) return null;
          const cost = E.techCost(s, i);
          const equipped = s.equipped.includes(i);
          const nextMilestone = TECH_MILESTONES.find((m) => m > st.lvl);
          const mastery = E.masteryLevel(st.masteryXp);
          return (
            <div key={t.id} className={`card ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''}`}>
              <div className="card-head">
                <span className={`elem elem-${t.element.toLowerCase()}`}>{ELEMENT_GLYPH[t.element]}</span>
                <div className="card-title">
                  <b>{t.name}</b>
                  <span className="muted small">{locked ? `Unlocks at ${REALMS[t.unlockRealm].name}` : `Level ${st.lvl} · mastery ${mastery}${t.element === s.root.element ? ' · root match' : ''}`}</span>
                </div>
              </div>
              <p className="small muted">{t.blurb}</p>
              {!locked && (
                <div className="card-foot">
                  <span className="small">{st.lvl > 0 ? `${fmt(E.techQps(s, i))} base qi/s` : `${fmt(t.baseQps)} qi/s per level`}{nextMilestone ? ` · x2 at level ${nextMilestone}` : ''}</span>
                  <div className="row">
                    {st.lvl > 0 && (
                      <button className={`btn small ${equipped ? 'on' : ''}`} onClick={() => act((x) => E.toggleEquip(x, i))}>{equipped ? 'Equipped' : 'Equip'}</button>
                    )}
                    <button className="btn small primary" disabled={s.stones < cost} onClick={() => act((x) => E.buyTech(x, i))}>
                      {st.lvl === 0 ? 'Learn' : 'Train'} · {fmt(cost)}
                    </button>
                  </div>
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
  const atk = E.playerAttack(s);
  const maxHp = E.playerMaxHp(s);
  return (
    <section>
      <h2 className="section-title">Beast hunts</h2>
      <p className="muted small">Your cultivator fights on their own and earns spirit stones. Tap Strike to hit harder. If a beast is too strong you simply retreat and rest. Nothing is lost.</p>
      {h.ground !== null && (
        <div className="battle">
          <div className="fighter">
            <b>You</b>
            <div className="bar thin"><div className="fill hp" style={{ width: `${Math.max(0, h.playerHp / maxHp) * 100}%` }} /></div>
            <span className="small muted">{h.recover > 0 ? `Resting ${Math.ceil(h.recover)}s` : `Attack ${fmt(atk)}/s`}</span>
          </div>
          <div className="vs">vs</div>
          <div className="fighter">
            <b>{HUNT_GROUNDS[h.ground].beast}</b>
            <div className="bar thin"><div className="fill enemy" style={{ width: `${h.respawn > 0 ? 0 : Math.max(0, h.beastHp / HUNT_GROUNDS[h.ground].hp) * 100}%` }} /></div>
            <span className="small muted">{h.respawn > 0 ? 'Tracking the next beast…' : `Attack ${fmt(HUNT_GROUNDS[h.ground].atk)}/s`}</span>
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
          const killTime = g.hp / atk;
          const survive = maxHp / g.atk;
          const verdict = locked ? '' : killTime < survive * 0.5 ? 'Easy' : killTime < survive ? 'Risky' : 'Too dangerous';
          return (
            <div key={g.id} className={`card ${locked ? 'locked' : ''} ${h.ground === i ? 'equipped' : ''}`}>
              <div className="card-head">
                <div className="card-title">
                  <b>{g.name}</b>
                  <span className="small muted">{locked ? `Opens at ${REALMS[g.unlockRealm].name}` : `${g.beast} · ${fmt(g.stones * Math.pow(1.5, E.k(s, 'vein')))} stones each`}</span>
                </div>
                {!locked && <span className={`verdict v-${verdict.split(' ')[0].toLowerCase()}`}>{verdict}</span>}
              </div>
              {!locked && h.ground !== i && (
                <button className="btn small" onClick={() => act((x) => E.setHunt(x, i))}>Hunt here</button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Elixirs({ s, act }: { s: E.GameState; act: ActFn }) {
  const clarityCost = clarityPillCost(s.realm);
  const longCost = longevityPillCost(s.realm, s.longevityUsed);
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
        <button className="btn small danger" onClick={() => { if (window.confirm('Erase all progress and start over?')) onReplace(E.newGame()); }}>Hard reset</button>
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
