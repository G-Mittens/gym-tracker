import React from "react";
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
}

export const LogTab: React.FC<Props> = ({ exercises, sets, exerciseId, mm, ss, weight, reps, editSetId, editMM, editSS, editWeight, editReps, currentExercise, addSet, setExerciseId, setMm, setSs, setWeight, setReps, startEditSet, saveEditSet, cancelEditSet, deleteSet, setEditMM, setEditSS, setEditWeight, setEditReps, styles, secondsToMMSS }) => {
  const isTime = currentExercise?.type === "time";
  return (
    <>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Quick Log</h2>
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
      </section>
      <section style={styles.card}>
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
      </section>
    </>
  );
};
