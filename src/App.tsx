import { useEffect, useState } from "react";
import { LogTab } from "./tabs/LogTab";
import { WorkoutsTab } from "./tabs/WorkoutsTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { db, seedExercisesIfEmpty } from "./db";
import type { Exercise, SetEntry } from "./db";
import { rid, readFilesAsDataUrls, mmssToSeconds, secondsToMMSS } from "./lib";

/* ---------- App ---------- */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"log" | "workouts" | "tools">("log");

  // data
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetEntry[]>([]);

  // quick log
  const [exerciseId, setExerciseId] = useState<string>("");
  const [weight, setWeight] = useState("30");
  const [reps, setReps] = useState("12");
  const [mm, setMm] = useState("1");
  const [ss, setSs] = useState("00");

  // add workout (Workouts tab)
  const [showManager, setShowManager] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"weight" | "time">("weight");
  const [newDesc, setNewDesc] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newPhotos, setNewPhotos] = useState<string[]>([]);

  // edit workout
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"weight" | "time">("weight");
  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);

  // collapsed state for workouts list (keeps details hidden until expanded)
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpanded(id: string) {
    setExpandedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev]));
  }

  const EXPANDED_KEY = "gym-tracker:expandedWorkouts";

  // load persisted expanded ids on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[] | null;
        if (Array.isArray(parsed)) {
          setExpandedIds(parsed.filter(id => exercises.some(e => e.id === id)));
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist when expandedIds changes
  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(expandedIds));
    } catch {
      // ignore quota errors
    }
  }, [expandedIds]);

  // prune expanded ids when exercises list changes (removes stale ids)
  useEffect(() => {
    setExpandedIds(prev => prev.filter(id => exercises.some(e => e.id === id)));
  }, [exercises]);

  // edit set
  const [editSetId, setEditSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("0");
  const [editReps, setEditReps] = useState("0");
  const [editMM, setEditMM] = useState("0");
  const [editSS, setEditSS] = useState("00");

  // countdown timer (rest) & stopwatch
  const [activeTimerSec, setActiveTimerSec] = useState<number | null>(null); // remaining seconds
  const [stopwatchSec, setStopwatchSec] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  // timer effect (pure countdown; logging occurs at start)
  useEffect(()=>{
    if (activeTimerSec == null) return;
    if (activeTimerSec <= 0) {
      // play completion sound (short beep sequence)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        function beep(tOffset:number, freq:number, dur:number){
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
          const now = ctx.currentTime + tOffset;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          o.start(now); o.stop(now + dur);
        }
        beep(0, 880, 0.18);
        beep(0.20, 660, 0.22);
      } catch {}
      setActiveTimerSec(null);
      return;
    }
    const id = setTimeout(()=> setActiveTimerSec(s => (s==null? null : s-1)), 1000);
    return () => clearTimeout(id);
  }, [activeTimerSec]);

  function startTimer(sec: number) {
    if (activeTimerSec != null) return; // ignore if already running
    setActiveTimerSec(sec);
    // log immediately
    (async () => {
      const entry: SetEntry = { id: rid(), ts: new Date().toISOString(), exerciseId: "rest_timer", durationSec: sec };
      await db.sets.add(entry);
      setSets(prev => [entry, ...prev]);
    })();
  }
  function cancelTimer() { setActiveTimerSec(null); }

  // stopwatch effect
  useEffect(()=>{
    if (!stopwatchRunning) return;
    const id = setInterval(()=> setStopwatchSec(s=>s+1), 1000);
    return ()=> clearInterval(id);
  }, [stopwatchRunning]);
  function startStopwatch() { setStopwatchRunning(true); }
  function stopStopwatch() { setStopwatchRunning(false); }
  function resetStopwatch() { setStopwatchRunning(false); setStopwatchSec(0); }

  /* load */
  useEffect(() => {
    (async () => {
      await seedExercisesIfEmpty();
      const xs = await db.exercises.toArray();
      setExercises(xs);
      const firstWeight = xs.find(e => e.type === "weight");
      setExerciseId(firstWeight?.id || xs[0]?.id || "");
      const ss = await db.sets.orderBy("ts").reverse().limit(50).toArray();
      setSets(ss);
      setLoaded(true);
    })();
  }, []);

  const currentExercise = exercises.find(e => e.id === exerciseId);
  const isTime = currentExercise?.type === "time";

  /* quick log */
  async function addSet() {
    if (!exerciseId) return;
    const entry: SetEntry = {
      id: rid(),
      ts: new Date().toISOString(),
      exerciseId,
      ...(isTime
        ? { durationSec: mmssToSeconds(mm, ss) }
        : { weight: Number(weight || 0), reps: Number(reps || 0) }),
    };
    await db.sets.add(entry);
    setSets(prev => [entry, ...prev]);
    if (isTime) setSs("00"); else setReps("12");
  }

  /* add workout */
  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setNewPhotos(await readFilesAsDataUrls(e.target.files, 3));
  }
  async function saveExercise() {
    const name = newName.trim();
    if (!name) return alert("Please enter a workout name.");
    const ex: Exercise = {
      id: `${newType}_${rid()}`,
      name,
      type: newType,
      description: newDesc.trim() || undefined,
      link: newLink.trim() || undefined,
      photos: newPhotos.length ? newPhotos : undefined,
    };
    await db.exercises.add(ex);
    const xs = await db.exercises.toArray();
    setExercises(xs);
    setExerciseId(ex.id);
    setShowManager(false);
    setNewName(""); setNewType("weight"); setNewDesc(""); setNewLink(""); setNewPhotos([]);
  }

  /* edit workout */
  function beginEditExercise(ex: Exercise) {
    setEditId(ex.id);
    setEditName(ex.name);
    setEditType(ex.type);
    setEditDesc(ex.description || "");
    setEditLink(ex.link || "");
    setEditPhotos(ex.photos ? [...ex.photos] : []);
  }
  async function handleEditPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setEditPhotos(await readFilesAsDataUrls(e.target.files, 3));
  }
  async function saveEditExercise() {
    if (!editId) return;
    const changes: Partial<Exercise> = {
      name: editName.trim(),
      type: editType,
      description: editDesc.trim() || undefined,
      link: editLink.trim() || undefined,
      photos: editPhotos.length ? editPhotos : undefined,
    };
    await db.exercises.update(editId, changes);
    const xs = await db.exercises.toArray();
    setExercises(xs);
    setEditId(null);
  }
  function cancelEditExercise() { setEditId(null); }
  async function deleteExercise(id: string) {
    const count = await db.sets.where("exerciseId").equals(id).count();
    const ok = confirm(count ? `Delete this workout AND ${count} logged set(s)?` : `Delete this workout?`);
    if (!ok) return;
    if (count) await db.sets.where("exerciseId").equals(id).delete();
    await db.exercises.delete(id);
    const xs = await db.exercises.toArray();
    setExercises(xs);
    if (exerciseId === id) setExerciseId(xs[0]?.id || "");
    // remove from expanded ids (and persisted storage will update via effect)
    setExpandedIds(prev => prev.filter(x => x !== id));
  }

  /* edit set */
  function startEditSet(s: SetEntry) {
    setEditSetId(s.id);
    if (s.durationSec != null) {
      const [m, s2] = secondsToMMSS(s.durationSec).split(":");
      setEditMM(m); setEditSS(s2);
    } else {
      setEditWeight(String(s.weight ?? 0));
      setEditReps(String(s.reps ?? 0));
    }
  }
  async function saveEditSet() {
    if (!editSetId) return;
    const s = sets.find(x => x.id === editSetId);
    if (!s) return;
    const changes = s.durationSec != null
      ? { durationSec: mmssToSeconds(editMM, editSS) }
      : { weight: Number(editWeight || 0), reps: Number(editReps || 0) };
    await db.sets.update(editSetId, changes);
    setSets(prev => prev.map(x => (x.id === editSetId ? { ...x, ...changes } as SetEntry : x)));
    setEditSetId(null);
  }
  function cancelEditSet() { setEditSetId(null); }
  async function deleteSet(id: string) {
    await db.sets.delete(id);
    setSets(prev => prev.filter(s => s.id !== id));
    if (editSetId === id) setEditSetId(null);
  }

  if (!loaded) return <div style={page}><h1>Gym Tracker</h1><div>Loading…</div></div>;

  return (
    <div style={page}>
      <h1 style={{ marginTop: 0 }}>Gym Tracker</h1>

      {/* Tabs */}
      <div style={tabsWrap}>
        <button style={tabBtn(tab === "log")} onClick={() => setTab("log")}>Log</button>
        <button style={tabBtn(tab === "workouts")} onClick={() => setTab("workouts")}>Workouts</button>
        <button style={tabBtn(tab === "tools")} onClick={() => setTab("tools")}>Tools</button>
      </div>

      {tab === "log" && (
        <LogTab
          exercises={exercises}
          sets={sets}
          exerciseId={exerciseId}
          mm={mm} ss={ss} weight={weight} reps={reps}
          editSetId={editSetId}
          editMM={editMM} editSS={editSS} editWeight={editWeight} editReps={editReps}
          currentExercise={currentExercise}
          addSet={addSet}
          setExerciseId={setExerciseId}
          setMm={setMm} setSs={setSs} setWeight={setWeight} setReps={setReps}
          startEditSet={startEditSet} saveEditSet={saveEditSet} cancelEditSet={cancelEditSet} deleteSet={deleteSet}
          setEditMM={setEditMM} setEditSS={setEditSS} setEditWeight={setEditWeight} setEditReps={setEditReps}
          styles={{ card, row3, label, inp, inpSmall, btn, btnSmall, btnDanger, btnGhostSmall }}
          secondsToMMSS={secondsToMMSS}
          activeTimerSec={activeTimerSec}
          startTimer={startTimer}
          cancelTimer={cancelTimer}
          stopwatchRunning={stopwatchRunning}
            stopwatchSec={stopwatchSec}
            startStopwatch={startStopwatch}
            stopStopwatch={stopStopwatch}
            resetStopwatch={resetStopwatch}
        />
      )}
      {tab === "workouts" && (
        <WorkoutsTab
          exercises={exercises}
          expandedIds={expandedIds}
          showManager={showManager}
          newName={newName} newType={newType} newDesc={newDesc} newLink={newLink} newPhotos={newPhotos}
          editId={editId} editName={editName} editType={editType} editDesc={editDesc} editLink={editLink} editPhotos={editPhotos}
          setNewName={setNewName} setNewType={setNewType} setNewDesc={setNewDesc} setNewLink={setNewLink}
          setShowManager={setShowManager}
          beginEditExercise={beginEditExercise} saveExercise={saveExercise} saveEditExercise={saveEditExercise} cancelEditExercise={cancelEditExercise} deleteExercise={deleteExercise}
          handleAddPhotos={handleAddPhotos} handleEditPhotos={handleEditPhotos}
          toggleExpanded={toggleExpanded}
          styles={{ card, label, inp, btn, btnGhost, chip, btnSmall, btnDanger, inpSmall, btnGhostSmall }}
        />
      )}
      {tab === "tools" && (
        <ToolsTab card={card} />
      )}
    </div>
  );
}

/* ---------- styles ---------- */
const page: React.CSSProperties = { padding: 16, fontFamily: "system-ui, sans-serif", color: "#eaeaea", background: "#111", minHeight: "100vh" };
const card: React.CSSProperties = { background: "#1a1a1a", padding: 12, borderRadius: 12, maxWidth: 960, marginBottom: 12 };
const tabsWrap: React.CSSProperties = { display: "flex", gap: 8, marginBottom: 12 };
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #333",
  background: active ? "#2d6cdf" : "#0f0f0f",
  color: active ? "white" : "#eaeaea",
  cursor: "pointer",
  fontWeight: 600,
});
const row3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 12 };
const label: React.CSSProperties = { display: "block", margin: "10px 0 6px" };
const inp: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 8, background: "#0f0f0f", color: "white", border: "1px solid #333" };
const inpSmall: React.CSSProperties = { width: 90, padding: 8, borderRadius: 8, background: "#0f0f0f", color: "white", border: "1px solid #333" };
const btn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, background: "#2d6cdf", color: "white", border: "none", fontWeight: 600, cursor: "pointer" };
const btnSmall: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, background: "#2d6cdf", color: "white", border: "none", fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, background: "transparent", color: "#eaeaea", border: "1px solid #444", fontWeight: 600, cursor: "pointer" };
const btnGhostSmall: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, background: "transparent", color: "#eaeaea", border: "1px solid #444", fontWeight: 600, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, background: "#b23b3b", color: "white", border: "none", fontWeight: 700, cursor: "pointer" };
const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #333",
  background: active ? "#2d6cdf" : "#0f0f0f",
  color: active ? "white" : "#eaeaea",
  userSelect: "none",
  cursor: "pointer",
});
