import React from "react";
import { toolBox, separator } from "../theme";
import type { Exercise, SetEntry } from "../db";

interface Props {
  exercises: Exercise[];
  sets: SetEntry[];
  exerciseId: string;
  mm: string; ss: string; weight: string; reps: string;
  editSetId: string | null;
  editMM: string; editSS: string; editWeight: string; editReps: string;
  currentExercise?: Exercise;
  addSet(): Promise<void> | void;
  setExerciseId(id: string): void;
  setMm(v: string): void; setSs(v: string): void; setWeight(v: string): void; setReps(v: string): void;
  startEditSet(s: SetEntry): void; saveEditSet(): Promise<void> | void; cancelEditSet(): void; deleteSet(id: string): Promise<void> | void;
  setEditMM(v: string): void; setEditSS(v: string): void; setEditWeight(v: string): void; setEditReps(v: string): void;
  styles: {
    card: React.CSSProperties; row3: React.CSSProperties; label: React.CSSProperties;
    inp: React.CSSProperties; inpSmall: React.CSSProperties; btn: React.CSSProperties; btnSmall: React.CSSProperties; btnDanger: React.CSSProperties; btnGhostSmall: React.CSSProperties;
  };
  secondsToMMSS(sec: number): string;
  // timer / stopwatch props
  activeTimerSec: number | null; // remaining seconds for active countdown
  startTimer(durationSec: number): void;
  cancelTimer(): void;
  stopwatchRunning: boolean;
  stopwatchSec: number;
  startStopwatch(): void; stopStopwatch(): void; resetStopwatch(): void;
}

export const LogTab: React.FC<Props> = ({ exercises, sets, exerciseId, mm, ss, weight, reps, editSetId, editMM, editSS, editWeight, editReps, currentExercise, addSet, setExerciseId, setMm, setSs, setWeight, setReps, startEditSet, saveEditSet, cancelEditSet, deleteSet, setEditMM, setEditSS, setEditWeight, setEditReps, styles, secondsToMMSS, activeTimerSec, startTimer, cancelTimer, stopwatchRunning, stopwatchSec, startStopwatch, stopStopwatch, resetStopwatch }) => {
  const isTime = currentExercise?.type === "time";
  return (
    <>
      <section style={styles.card}>
        <div style={toolBox} className="tool-box">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }} className="quicklog-flex">
          <h2 style={{ margin: 0 }}>Quick Log</h2>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { label: "30s", sec: 30 },
              { label: "1m", sec: 60 },
              { label: "3m", sec: 180 },
              { label: "5m", sec: 300 },
            ].map(b => (
              <button
                key={b.sec}
                onClick={()=> (activeTimerSec ? undefined : startTimer(b.sec))}
                disabled={!!activeTimerSec}
                style={{
                  padding:"6px 14px",
                  borderRadius:8,
                  border:"1px solid #664b16",
                  background: activeTimerSec ? "#3a2a0b" : "#ff9d3b",
                  color:"#111",
                  fontWeight:700,
                  cursor: activeTimerSec ? "not-allowed" : "pointer"
                }}
              >{b.label}</button>
            ))}
            {activeTimerSec != null && (
              <button onClick={cancelTimer} style={{ padding:"6px 10px", borderRadius:8, background:"#552", color:"#fff", border:"1px solid #664b16", fontWeight:600 }}>Cancel</button>
            )}
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          {activeTimerSec != null && (
            <div style={{ fontWeight:600, fontSize:20, color:"#ffb054" }}>Timer: {secondsToMMSS(activeTimerSec)}</div>
          )}
          <div style={{ marginTop:8, display:"flex", width:"100%", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {!stopwatchRunning && <button onClick={startStopwatch} style={swBtn}>Start</button>}
            {stopwatchRunning && <button onClick={stopStopwatch} style={swBtn}>Pause</button>}
            <button onClick={resetStopwatch} style={swBtn}>Reset</button>
            <div style={{ fontWeight:600 }}>Stopwatch: <span style={{ fontVariantNumeric:"tabular-nums" }}>{secondsToMMSS(stopwatchSec)}</span></div>
          </div>
        </div>
        <label style={styles.label}>Exercise</label>
        <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={styles.inp}>
          {exercises.map(e => (
            <option key={e.id} value={e.id}>{e.name} {e.type === "time" ? "⏱" : ""}</option>
          ))}
        </select>
        {isTime ? (
          <div style={styles.row3}>
            <input inputMode="numeric" value={mm} onChange={e => setMm(e.target.value)} style={styles.inp} placeholder="mm" />
            <input inputMode="numeric" value={ss} onChange={e => setSs(e.target.value)} style={styles.inp} placeholder="ss" />
            <button onClick={addSet} style={styles.btn}>Add time</button>
          </div>
        ) : (
          <div style={styles.row3}>
            <input inputMode="numeric" value={weight} onChange={e => setWeight(e.target.value)} style={styles.inp} placeholder="Weight (lb)" />
            <input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} style={styles.inp} placeholder="Reps" />
            <button onClick={addSet} style={styles.btn}>Add set</button>
          </div>
        )}
        </div>
      </section>
      <section style={styles.card}>
        <div style={separator} />
  <div style={toolBox} className="tool-box">
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
                      <button style={styles.btnSmall} onClick={() => startEditSet(s)}>Edit</button>
                      <button style={styles.btnDanger} onClick={() => deleteSet(s.id)}>Delete</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isTimeSet ? (
                        <>
                          <input inputMode="numeric" value={editMM} onChange={e => setEditMM(e.target.value)} style={styles.inpSmall} placeholder="mm" />
                          <input inputMode="numeric" value={editSS} onChange={e => setEditSS(e.target.value)} style={styles.inpSmall} placeholder="ss" />
                        </>
                      ) : (
                        <>
                          <input inputMode="numeric" value={editWeight} onChange={e => setEditWeight(e.target.value)} style={styles.inpSmall} placeholder="Weight" />
                          <input inputMode="numeric" value={editReps} onChange={e => setEditReps(e.target.value)} style={styles.inpSmall} placeholder="Reps" />
                        </>
                      )}
                      <button style={styles.btnSmall} onClick={saveEditSet}>Save</button>
                      <button style={styles.btnGhostSmall} onClick={cancelEditSet}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            );
        })}
        </div>
      </section>
    </>
  );
};

const swBtn: React.CSSProperties = { padding:"6px 8px", borderRadius:8, background:"#444", color:"#fff", border:"1px solid #555", fontWeight:600, cursor:"pointer" };
