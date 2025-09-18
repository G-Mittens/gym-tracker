import React, { useEffect, useMemo, useState } from "react";

export type OneRmFormula = "Epley" | "Brzycki" | "Lombardi" | "Mayhew" | "OCONNER";
interface BaseProps {
  unit: "lb" | "kg";
  onUnitChange?(u: "lb" | "kg"): void;
}
interface FullProps extends BaseProps { variant?: "full"; }
interface CompactProps extends BaseProps { variant: "compact"; }
export type OneRepMaxProps = FullProps | CompactProps;

const FORMULAS: { key: OneRmFormula; label: string; calc: (w:number,r:number)=>number }[] = [
  { key: "Epley", label: "Epley", calc: (w,r)=> r===1? w : w*(1+ r/30) },
  { key: "Brzycki", label: "Brzycki", calc: (w,r)=> w * 36 / (37 - r) },
  { key: "Lombardi", label: "Lombardi", calc: (w,r)=> w * Math.pow(r,0.10) },
  { key: "Mayhew", label: "Mayhew (NFL)", calc: (w,r)=> (100*w) / (52.2 + 41.9 * Math.exp(-0.055*r)) },
  { key: "OCONNER", label: "O'Conner", calc: (w,r)=> w * (1 + 0.025 * r) },
];

const LOCAL_KEY = "gym-tracker:1rm";

export const OneRepMax: React.FC<OneRepMaxProps> = ({ unit, onUnitChange, variant }) => {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const [formula, setFormula] = useState<OneRmFormula>("Epley");
  const [expanded, setExpanded] = useState(false); // for compact variant

  // load persisted
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { w:string; r:string; f:OneRmFormula; u:"lb"|"kg" };
      if (p?.w) setWeight(p.w);
      if (p?.r) setReps(p.r);
      if (p?.f) setFormula(p.f);
      if (p?.u && onUnitChange) onUnitChange(p.u);
  } catch { /* ignore parse/persist errors */ }
  }, [onUnitChange]);

  // persist
  useEffect(()=>{
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ w: weight, r: reps, f: formula, u: unit })); } catch { /* ignore quota */ }
  }, [weight, reps, formula, unit]);

  const repNum = Number(reps) || 0;
  const weightNum = Number(weight) || 0;
  const activeFormula = FORMULAS.find(f=>f.key===formula)!;
  const est = useMemo(()=> {
    if (repNum < 1 || weightNum <=0) return 0;
    return activeFormula.calc(weightNum, repNum);
  }, [activeFormula, repNum, weightNum]);

  const percentTable = useMemo(()=>{
    if (!est) return [] as { reps:number; est:number }[];
    const xs: { reps:number; est:number }[] = [];
    for (let r=1;r<=10;r++) {
      // Invert formula roughly by trial: use typical % charts scaling
      // We'll approximate using Epley inverse for display consistency regardless of chosen formula.
      const perc = 1 / (1 + r/30); // inverse epley percentage
      xs.push({ reps: r, est: est*perc });
    }
    return xs;
  }, [est]);

  const mainNumber = est ? est.toFixed(1) : "-";

  if (variant === "compact") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight:600 }}>1RM:</div>
        <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder={`Wt (${unit})`} style={compactInp} />
        <input value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" style={compactInp} />
        <div style={{ fontWeight:700 }}>{mainNumber}{unit}</div>
        <button onClick={()=>setExpanded(x=>!x)} style={miniBtn}>{expanded?"−":"+"}</button>
        {expanded && (
          <div style={compactPanel}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {FORMULAS.map(f=> (
                <button key={f.key} onClick={()=>setFormula(f.key)} style={miniFormulaBtn(f.key===formula)}>{f.label}</button>
              ))}
              <button onClick={()=> onUnitChange && onUnitChange(unit==="lb"?"kg":"lb")} style={miniBtn}>{unit.toUpperCase()}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 8px" }}>1RM Estimator</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display:"grid", gap:4 }}>
          <label style={label}>Weight ({unit})</label>
          <input value={weight} onChange={e=>setWeight(e.target.value)} style={inp} />
        </div>
        <div style={{ display:"grid", gap:4 }}>
          <label style={label}>Reps</label>
          <input value={reps} onChange={e=>setReps(e.target.value)} style={inp} />
        </div>
        <div style={{ display:"grid", gap:4 }}>
          <label style={label}>Formula</label>
          <select value={formula} onChange={e=>setFormula(e.target.value as OneRmFormula)} style={inp}>
            {FORMULAS.map(f=> <option key={f.key} value={f.key}>{f.label}</option> )}
          </select>
        </div>
        <div style={{ display:"grid", gap:4 }}>
          <label style={label}>Unit</label>
          <button onClick={()=> onUnitChange && onUnitChange(unit==="lb"?"kg":"lb")} style={btn}>{unit.toUpperCase()}</button>
        </div>
        <div style={{ display:"grid", gap:4 }}>
          <label style={label}>Estimated 1RM</label>
          <div style={{ fontSize:28, fontWeight:700, padding:"6px 10px" }}>{mainNumber}{unit}</div>
        </div>
      </div>
      <div style={{ marginTop:16 }}>
        <div style={{ fontWeight:600, marginBottom:6 }}>Approx % Table (Epley inverse)</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {percentTable.map(r => (
            <div key={r.reps} style={pctBox}>
              <div style={{ fontSize:11, opacity:0.7 }}>{r.reps} rep{r.reps>1?"s":""}</div>
              <div style={{ fontWeight:600 }}>{r.est.toFixed(0)}{unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* styles */
const label: React.CSSProperties = { fontSize:12, fontWeight:600 };
const inp: React.CSSProperties = { padding:"8px 10px", borderRadius:8, background:"#0f0f0f", color:"#eaeaea", border:"1px solid #333", minWidth:90 };
const btn: React.CSSProperties = { padding:"8px 10px", borderRadius:8, background:"#2d6cdf", color:"#fff", border:"none", fontWeight:600, cursor:"pointer" };
const pctBox: React.CSSProperties = { padding:"6px 10px", background:"#181818", border:"1px solid #333", borderRadius:8, minWidth:68, textAlign:"center" };

// compact
const compactInp: React.CSSProperties = { width:60, padding:"4px 6px", borderRadius:6, background:"#0f0f0f", color:"#eaeaea", border:"1px solid #333" };
const miniBtn: React.CSSProperties = { padding:"4px 8px", borderRadius:6, background:"#2d6cdf", color:"#fff", border:"none", cursor:"pointer", fontWeight:600 };
const miniFormulaBtn = (active:boolean): React.CSSProperties => ({ padding:"4px 8px", borderRadius:6, border:"1px solid #333", background: active?"#2d6cdf":"#1d1d1d", color: active?"#fff":"#e0e0e0", fontSize:12, cursor:"pointer" });
const compactPanel: React.CSSProperties = { display:"flex", flexDirection:"column", gap:6, background:"#181818", border:"1px solid #333", borderRadius:8, padding:8 };
