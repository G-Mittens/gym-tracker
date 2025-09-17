import { useEffect, useState } from "react";
import { db, seedExercisesIfEmpty } from "./db";
import type { Exercise, SetEntry } from "./db";
import { rid, readFilesAsDataUrls, mmssToSeconds, secondsToMMSS } from "./lib";

/* ---------- App ---------- */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"log" | "workouts">("log");

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
      </div>

      {tab === "log" ? (
        <>
          {/* Quick Log */}
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Quick Log</h2>

            <label style={label}>Exercise</label>
            <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={inp}>
              {exercises.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.type === "time" ? "⏱" : ""}</option>
              ))}
            </select>

            {currentExercise?.type === "time" ? (
              <div style={row3}>
                <input inputMode="numeric" value={mm} onChange={e => setMm(e.target.value)} style={inp} placeholder="mm" />
                <input inputMode="numeric" value={ss} onChange={e => setSs(e.target.value)} style={inp} placeholder="ss" />
                <button onClick={addSet} style={btn}>Add time</button>
              </div>
            ) : (
              <div style={row3}>
                <input inputMode="numeric" value={weight} onChange={e => setWeight(e.target.value)} style={inp} placeholder="Weight (lb)" />
                <input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} style={inp} placeholder="Reps" />
                <button onClick={addSet} style={btn}>Add set</button>
              </div>
            )}
          </section>

          {/* Recent Sets */}
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Recent Sets</h2>
            {sets.length === 0 && <div style={{ opacity: 0.7 }}>No sets yet — add one above.</div>}
            {sets.map(s => {
              const ex = exercises.find(e => e.id === s.exerciseId);
              const editing = editSetId === s.id;
              const isTimeSet = s.durationSec != null;
              return (
                <div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ex?.name || s.exerciseId}</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>{new Date(s.ts).toLocaleString()}</div>
                    </div>
                    {!editing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div>{isTimeSet ? secondsToMMSS(s.durationSec || 0) : `${s.weight} lb × ${s.reps}`}</div>
                        <button style={btnSmall} onClick={() => startEditSet(s)}>Edit</button>
                        <button style={btnDanger} onClick={() => deleteSet(s.id)}>Delete</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isTimeSet ? (
                          <>
                            <input inputMode="numeric" value={editMM} onChange={e => setEditMM(e.target.value)} style={inpSmall} placeholder="mm" />
                            <input inputMode="numeric" value={editSS} onChange={e => setEditSS(e.target.value)} style={inpSmall} placeholder="ss" />
                          </>
                        ) : (
                          <>
                            <input inputMode="numeric" value={editWeight} onChange={e => setEditWeight(e.target.value)} style={inpSmall} placeholder="Weight" />
                            <input inputMode="numeric" value={editReps} onChange={e => setEditReps(e.target.value)} style={inpSmall} placeholder="Reps" />
                          </>
                        )}
                        <button style={btnSmall} onClick={saveEditSet}>Save</button>
                        <button style={btnGhostSmall} onClick={cancelEditSet}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      ) : (
        <>
          {/* Workouts tab */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>Your Workouts</h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setShowManager(v => !v)} style={btn}>
                  {showManager ? "Close" : "Add workout"}
                </button>
                <button
                  style={{ ...btnGhost, padding: "8px 10px", fontWeight: 600 }}
                  onClick={async () => {
                    const ex = await db.exercises.toArray();
                    const ss = await db.sets.toArray();
                    const data = { exercises: ex, sets: ss };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "gym-tracker-backup.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </button>
                <label style={{ ...btnGhost, padding: "6px 8px", cursor: "pointer" }}>
                  Import
                  <input
                    type="file"
                    accept="application/json"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const text = await f.text();
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed.exercises)) await db.exercises.bulkPut(parsed.exercises);
                        if (Array.isArray(parsed.sets)) await db.sets.bulkPut(parsed.sets);
                        const xs = await db.exercises.toArray();
                        setExercises(xs);
                        const ss = await db.sets.orderBy("ts").reverse().limit(50).toArray();
                        setSets(ss);
                        alert("Import complete");
                      } catch {
                        alert("Invalid file");
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            {showManager && (
              <div style={{ border: "1px solid #222", borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <label style={label}>Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} style={inp} placeholder="e.g., Incline Dumbbell Press" />

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <label style={chip(newType === "weight")} onClick={() => setNewType("weight")}>Weight × Reps</label>
                  <label style={chip(newType === "time")} onClick={() => setNewType("time")}>Time (mm:ss)</label>
                </div>

                <label style={label}>Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...inp, height: 80 }} placeholder="Tips, cues…" />

                <label style={label}>Help link (optional)</label>
                <input value={newLink} onChange={e => setNewLink(e.target.value)} style={inp} placeholder="https://youtu.be/..." />

                <label style={label}>Photos (up to 3)</label>
                <input type="file" accept="image/*" multiple onChange={handleAddPhotos} />
                {newPhotos.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {newPhotos.map((src, i) => (
                      <img key={i} src={src} alt={`preview-${i}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #333" }} />
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={saveExercise} style={btn}>Save</button>
                  <button onClick={() => setShowManager(false)} style={btnGhost}>Cancel</button>
                </div>
              </div>
            )}

            {exercises.length === 0 && <div style={{ opacity: 0.7 }}>No workouts yet.</div>}
            {exercises.map(ex => {
              const editing = editId === ex.id;
              const expanded = expandedIds.includes(ex.id) || editing;
              return (
                <div key={ex.id} style={{ borderTop: "1px solid #222", padding: "10px 0" }}>
                  {!editing ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* compact arrow toggle only */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              aria-label={expanded ? "Collapse" : "Expand"}
                              onClick={() => toggleExpanded(ex.id)}
                              style={{
                                width: 28,
                                height: 28,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                border: "1px solid #333",
                                background: expanded ? "#2d6cdf" : "#222",
                                color: "#eaeaea",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {expanded ? "▾" : "▸"}
                            </button>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleExpanded(ex.id)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpanded(ex.id); }}
                              style={{ fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                              title={expanded ? "Click to collapse" : "Click to expand"}
                            >
                              {ex.name} {ex.type === "time" ? "⏱" : ""}
                            </div>
                          </div>
                        </div>
                        {expanded && ex.description && <div style={{ opacity: 0.9 }}>{ex.description}</div>}
                        {expanded && ex.link && <div><a href={ex.link} target="_blank" rel="noreferrer" style={{ color: "#7fb1ff" }}>Tutorial</a></div>}
                        {expanded && ex.photos?.length ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                            {ex.photos.map((src, i) => (
                              <img key={i} src={src} alt={`ex-${i}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #333" }} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button style={btnSmall} onClick={() => beginEditExercise(ex)}>Edit</button>
                        <button style={btnDanger} onClick={() => deleteExercise(ex.id)}>Delete</button>
                        {/* left-side arrow toggle now handles expand/collapse */}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} style={inp} placeholder="Name" />
                      <div style={{ display: "flex", gap: 12 }}>
                        <label style={chip(editType === "weight")} onClick={() => setEditType("weight")}>Weight × Reps</label>
                        <label style={chip(editType === "time")} onClick={() => setEditType("time")}>Time (mm:ss)</label>
                      </div>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inp, height: 80 }} placeholder="Description" />
                      <input value={editLink} onChange={e => setEditLink(e.target.value)} style={inp} placeholder="https://…" />
                      <div>
                        <input type="file" accept="image/*" multiple onChange={handleEditPhotos} />
                        {editPhotos.length > 0 && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                            {editPhotos.map((src, i) => (
                              <img key={i} src={src} alt={`edit-${i}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #333" }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={btnSmall} onClick={saveEditExercise}>Save</button>
                        <button style={btnGhostSmall} onClick={cancelEditExercise}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </>
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
