import React from "react";
import { toolBox, thinSeparator } from "../theme";
import type { Exercise } from "../db";

interface Props {
  exercises: Exercise[];
  expandedIds: string[];
  showManager: boolean;
  newName: string; newType: "weight" | "time"; newDesc: string; newLink: string; newPhotos: string[];
  editId: string | null; editName: string; editType: "weight" | "time"; editDesc: string; editLink: string; editPhotos: string[];
  setNewName(v: string): void; setNewType(v: "weight" | "time"): void; setNewDesc(v: string): void; setNewLink(v: string): void;
  setShowManager(v: boolean): void;
  beginEditExercise(ex: Exercise): void; saveExercise(): void; saveEditExercise(): void; cancelEditExercise(): void; deleteExercise(id: string): void;
  handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>): void; handleEditPhotos(e: React.ChangeEvent<HTMLInputElement>): void;
  toggleExpanded(id: string): void;
  styles: { card: React.CSSProperties; label: React.CSSProperties; inp: React.CSSProperties; btn: React.CSSProperties; btnGhost: React.CSSProperties; chip(active:boolean): React.CSSProperties; btnSmall: React.CSSProperties; btnDanger: React.CSSProperties; inpSmall: React.CSSProperties; btnGhostSmall: React.CSSProperties; };
}

export const WorkoutsTab: React.FC<Props> = ({ exercises, expandedIds, showManager, newName, newType, newDesc, newLink, newPhotos, editId, editName, editType, editDesc, editLink, editPhotos, setNewName, setNewType, setNewDesc, setNewLink, setShowManager, beginEditExercise, saveExercise, saveEditExercise, cancelEditExercise, deleteExercise, handleAddPhotos, handleEditPhotos, toggleExpanded, styles }) => {
  return (
    <section style={styles.card}>
      <div style={toolBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Your Workouts</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowManager(!showManager)} style={styles.btn}>
            {showManager ? "Close" : "Add workout"}
          </button>
        </div>
      </div>

      {showManager && (
        <div style={{ border: "1px solid #222", borderRadius: 12, padding: "12px 12px 16px", marginBottom: 16, background: "#181818" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ ...styles.label, margin: 0 }}>Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ ...styles.inp, boxSizing: "border-box" }}
                placeholder="e.g., Incline Dumbbell Press"
              />
            </div>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              <label style={styles.chip(newType === "weight")} onClick={() => setNewType("weight")}>Weight × Reps</label>
              <label style={styles.chip(newType === "time")} onClick={() => setNewType("time")}>Time (mm:ss)</label>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ ...styles.label, margin: 0 }}>Description</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={{ ...styles.inp, height: 90, padding: 10, boxSizing: "border-box", width: "100%", resize: "vertical" }}
                placeholder="Tips, cues…"
              />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ ...styles.label, margin: 0 }}>Help link (optional)</label>
              <input
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                style={{ ...styles.inp, boxSizing: "border-box" }}
                placeholder="https://youtu.be/..."
              />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ ...styles.label, margin: 0 }}>Photos (up to 3)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2d6cdf", color: "black", fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                  Choose Files
                  <input type="file" accept="image/*" multiple onChange={handleAddPhotos} style={{ display: "none" }} />
                </label>
                {newPhotos.length === 0 && <span style={{ opacity: 0.6, fontSize: 12 }}>No file chosen</span>}
              </div>
              {newPhotos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {newPhotos.map((src, i) => (
                    <img key={i} src={src} alt={`preview-${i}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #333" }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveExercise} style={styles.btn}>Save</button>
              <button onClick={() => setShowManager(false)} style={styles.btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {exercises.length === 0 && <div style={{ opacity: 0.7 }}>No workouts yet.</div>}
      {exercises.map((ex, idx) => {
        const editing = editId === ex.id;
        const expanded = expandedIds.includes(ex.id) || editing;
        return (
          <div key={ex.id} style={{ padding: "12px 0" }}>
            {idx > 0 && <div style={thinSeparator} />}
            {!editing ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  <button style={styles.btnSmall} onClick={() => beginEditExercise(ex)}>Edit</button>
                  <button style={styles.btnDanger} onClick={() => deleteExercise(ex.id)}>Delete</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <input value={editName} onChange={e => setNewName(e.target.value)} style={styles.inp} placeholder="Name" />
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={styles.chip(editType === "weight")} onClick={() => setNewType("weight")}>Weight × Reps</label>
                  <label style={styles.chip(editType === "time")} onClick={() => setNewType("time")}>Time (mm:ss)</label>
                </div>
                <textarea value={editDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...styles.inp, height: 80 }} placeholder="Description" />
                <input value={editLink} onChange={e => setNewLink(e.target.value)} style={styles.inp} placeholder="https://…" />
                <div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2d6cdf", color: "black", fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                    Choose Files
                    <input type="file" accept="image/*" multiple onChange={handleEditPhotos} style={{ display: "none" }} />
                  </label>
                  {editPhotos.length === 0 && <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 12 }}>No file chosen</span>}
                  {editPhotos.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {editPhotos.map((src, i) => (
                        <img key={i} src={src} alt={`edit-${i}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #333" }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.btnSmall} onClick={saveEditExercise}>Save</button>
                  <button style={styles.btnGhostSmall} onClick={cancelEditExercise}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </section>
  );
};
