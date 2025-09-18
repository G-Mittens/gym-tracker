import React, { useMemo, useState, useEffect } from "react";
import { toolBox, separator } from "../theme";
import { OneRepMax } from "../components/OneRepMax";

interface Props { card: React.CSSProperties; }

interface PlateOption { weight: number; enabled: boolean; }

// Common plate sets for lb and kg gyms
const DEFAULT_LB_PLATES = [45, 35, 25, 15, 10, 5, 2.5];
const DEFAULT_KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export const ToolsTab: React.FC<Props> = ({ card }) => {
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [target, setTarget] = useState("225"); // total weight on bar incl bar
  const [bar, setBar] = useState("45");
  const [customPlates, setCustomPlates] = useState("" ); // optional comma list
  const [plateState, setPlateState] = useState<PlateOption[]>(() => DEFAULT_LB_PLATES.map(w => ({ weight: w, enabled: true })));
  const PLATE_KEY = "gym-tracker:plates:forward";

  // load persisted forward plate calc
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(PLATE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { u: "lb"|"kg"; t:string; b:string; c:string; disabled:number[] };
      if (p.u) setUnit(p.u);
      if (p.b) setBar(p.b);
      if (p.t) setTarget(p.t);
      if (p.c) setCustomPlates(p.c);
      if (p.disabled?.length) {
        setPlateState(arr => arr.map(pl => p.disabled.includes(pl.weight) ? { ...pl, enabled:false } : pl));
      }
  } catch (e) { /* ignore localStorage read */ }
  }, []);
  // persist forward plate calc
  useEffect(()=>{
    try {
      const disabled = plateState.filter(p=>!p.enabled).map(p=>p.weight);
      localStorage.setItem(PLATE_KEY, JSON.stringify({ u:unit, t:target, b:bar, c:customPlates, disabled }));
  } catch (e) { /* ignore localStorage write */ }
  }, [unit, target, bar, customPlates, plateState]);

  // When unit toggles, reset plates intelligently
  function toggleUnit(next: "lb" | "kg") {
    if (next === unit) return;
    setUnit(next);
    setPlateState((next === "lb" ? DEFAULT_LB_PLATES : DEFAULT_KG_PLATES).map(w => ({ weight: w, enabled: true })));
    setBar(next === "lb" ? "45" : "20");
    setTarget(next === "lb" ? "225" : "100");
    setCustomPlates("");
  }

  function togglePlate(w: number) {
    setPlateState(ps => ps.map(p => p.weight === w ? { ...p, enabled: !p.enabled } : p));
  }

  const parsedCustom: number[] = useMemo(() => {
    if (!customPlates.trim()) return [];
    return customPlates.split(/[,\s]+/).map(s => Number(s)).filter(n => n > 0 && !Number.isNaN(n)).sort((a,b)=>b-a);
  }, [customPlates]);

  const availablePlates = useMemo(() => {
    const base = plateState.filter(p => p.enabled).map(p => p.weight);
    const merged = [...base, ...parsedCustom];
    // remove dups but keep order descending
    const uniq: number[] = [];
    merged.sort((a,b)=>b-a).forEach(w => { if (!uniq.includes(w)) uniq.push(w); });
    return uniq;
  }, [plateState, parsedCustom]);

  interface CalcResult { perSide: Record<number, number>; remaining: number; exact: boolean; usedTotal: number; }
  function calc(): CalcResult | null {
    const tgt = Number(target);
    const barW = Number(bar);
    if (Number.isNaN(tgt) || Number.isNaN(barW) || tgt <= 0 || barW <= 0 || tgt < barW) return null;
    const perSideNeeded = (tgt - barW) / 2;
    if (perSideNeeded < 0) return null;
    let rem = perSideNeeded;
    const perSide: Record<number, number> = {};
    for (const w of availablePlates) {
      if (w <= 0) continue;
      const cnt = Math.floor((rem + 1e-9) / w); // small epsilon to handle fp
      if (cnt > 0) {
        perSide[w] = cnt;
        rem -= cnt * w;
      }
    }
    const exact = Math.abs(rem) < 1e-6;
    const usedTotal = exact ? tgt : tgt - rem * 2;
    return { perSide, remaining: rem, exact, usedTotal };
  }

  const result = useMemo(calc, [target, bar, availablePlates]);

  const plateKeys = Object.keys(result?.perSide || {}).map(Number).sort((a,b)=>b-a);

  return (
    <section style={card}>
      <h2 style={{ marginTop: 0 }}>Tools</h2>
  <div style={toolBox} className="tool-box">
        <h3 style={{ margin: "0 0 6px" }}>Barbell Plate Calculator</h3>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>Compute plate loading for a target barbell weight. Toggle plates to match your gym inventory or add custom sizes.</div>

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => toggleUnit("lb")} style={unitBtn(unit === "lb")}>LB</button>
          <button onClick={() => toggleUnit("kg")} style={unitBtn(unit === "kg")}>KG</button>
        </div>
        <div style={row}>
          <label style={label}>Target ({unit})</label>
          <input value={target} onChange={e=>setTarget(e.target.value)} style={inp} />
        </div>
        <div style={row}>
          <label style={label}>Bar ({unit})</label>
          <input value={bar} onChange={e=>setBar(e.target.value)} style={inp} />
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={label}>Available Plates (each side)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {plateState.map(p => (
              <span key={p.weight} onClick={() => togglePlate(p.weight)} style={chip(p.enabled)} title={p.enabled ? "Click to disable" : "Click to enable"}>{p.weight}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={label}>Custom Plates (comma or space separated)</label>
          <input value={customPlates} onChange={e=>setCustomPlates(e.target.value)} style={inp} placeholder={unit === "lb" ? "Example: 55 35 7.5" : "Example: 7.5 0.5"} />
        </div>
      </div>

        <div style={{ marginTop: 18 }}>
        {!result && <div style={{ opacity: 0.7 }}>Enter valid numbers (target ≥ bar).</div>}
        {result && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600 }}>Load Per Side:</div>
            {plateKeys.length === 0 && <div style={{ opacity: 0.7 }}>No plates needed (target equals bar weight).</div>}
            {plateKeys.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {plateKeys.map(w => (
                  <div key={w} style={plateBox} className="plate-box">
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{w}{unit}</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{result.perSide[w]}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 14 }}>
              {result.exact ? (
                <span style={{ color: "#62c462" }}>Exact match.</span>
              ) : (
                <span style={{ color: "#e5a546" }}>Approximate. Short by {(result.remaining*2).toFixed(2)} {unit}. Using {result.usedTotal.toFixed(2)} {unit}.</span>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
  <div style={separator} />
  <div style={toolBox} className="tool-box">
        <ReversePlateCalculator />
      </div>
      <div style={separator} />
  <div style={toolBox} className="tool-box">
        <OneRepMax unit={unit} onUnitChange={setUnit} />
      </div>
    </section>
  );
};

/* ---------------- Reverse Plate Calculator (separate) ---------------- */
const ReversePlateCalculator: React.FC = () => {
  const [unit, setUnit] = useState<"lb"|"kg">("lb");
  const [bar, setBar] = useState("45");
  const [custom, setCustom] = useState("");
  const REVERSE_KEY = "gym-tracker:plates:reverse";
  // dynamic list of plate sizes for this reverse calc (separate from forward one)
  const basePlates = unit === "lb" ? DEFAULT_LB_PLATES : DEFAULT_KG_PLATES;
  const customPlates = useMemo(()=> custom.split(/[\s,]+/).map(n=>Number(n)).filter(n=>n>0&&!Number.isNaN(n)), [custom]);
  const plateSizes = useMemo(()=> {
    const all = [...basePlates, ...customPlates];
    const uniq: number[] = [];
    all.sort((a,b)=>b-a).forEach(w=>{ if(!uniq.includes(w)) uniq.push(w); });
    return uniq;
  }, [basePlates, customPlates]);

  // counts per side state (object keyed by weight)
  const [counts, setCounts] = useState<Record<string,string>>({});
  // load persisted reverse
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(REVERSE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { u:"lb"|"kg"; b:string; c:string; counts:Record<string,string> };
      if (p.u) setUnit(p.u);
      if (p.b) setBar(p.b);
      if (p.c) setCustom(p.c);
      if (p.counts) setCounts(p.counts);
  } catch (e) { /* ignore localStorage read */ }
  }, []);
  useEffect(()=>{
  try { localStorage.setItem(REVERSE_KEY, JSON.stringify({ u:unit, b:bar, c:custom, counts })); } catch (e) { /* ignore quota */ }
  }, [unit, bar, custom, counts]);

  // reset when unit changes
  function toggleUnit(u: "lb"|"kg") {
    if (u===unit) return;
    setUnit(u);
    setBar(u === "lb" ? "45" : "20");
    setCounts({});
    setCustom("");
  }

  function updateCount(w: number, v: string) {
    setCounts(prev => ({ ...prev, [w]: v }));
  }

  const total = useMemo(()=> {
    const barW = Number(bar) || 0;
    let perSide = 0;
    for (const w of plateSizes) {
      const cnt = Number(counts[w] || 0);
      if (!Number.isFinite(cnt) || cnt <= 0) continue;
      perSide += w * cnt;
    }
    return barW + perSide * 2;
  }, [bar, counts, plateSizes]);

  return (
    <div>
      <h3 style={{ margin: "0 0 6px" }}>Reverse Plate Total</h3>
      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>Enter how many plates of each size are on one side to get total bar weight.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={()=>toggleUnit("lb")} style={unitBtn(unit==="lb")}>LB</button>
        <button onClick={()=>toggleUnit("kg")} style={unitBtn(unit==="kg")}>KG</button>
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={label}>Bar ({unit})</label>
          <input value={bar} onChange={e=>setBar(e.target.value)} style={inp} />
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={label}>Custom Plate Sizes</label>
          <input value={custom} onChange={e=>setCustom(e.target.value)} style={inp} placeholder={unit==="lb"?"Example: 55 7.5":"Example: 0.5 7.5"} />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={label}>Plate Counts (per side)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {plateSizes.map(w => (
              <div key={w} style={reversePlateBox}>
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>{w}{unit}</div>
                <input
                  value={counts[w] || ""}
                  onChange={e=>updateCount(w, e.target.value.replace(/[^0-9.]/g, ""))}
                  style={reverseInput}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Total: {Number.isFinite(total) ? total.toFixed(2) : "-"} {unit}</div>
      </div>
    </div>
  );
};

/* --- local styles for tool --- */
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 4 };
const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, background: "#0f0f0f", color: "white", border: "1px solid #333", width: 140 };
const row: React.CSSProperties = { display: "grid", gap: 4 };
const unitBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #333",
  background: active ? "#2d6cdf" : "#0f0f0f",
  color: active ? "white" : "#eaeaea",
  cursor: "pointer",
  fontWeight: 600,
});
const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #333",
  background: active ? "#2d6cdf" : "#222",
  color: active ? "white" : "#eaeaea",
  fontSize: 13,
  cursor: "pointer",
  userSelect: "none",
});
const plateBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#181818",
  padding: "10px 12px",
  border: "1px solid #333",
  borderRadius: 10,
  minWidth: 60,
};
// toolBox & separator now imported from theme.ts
const reversePlateBox: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, background: "#181818", border: "1px solid #333", padding: 6, borderRadius: 10, width: 70, alignItems: "center" };
const reverseInput: React.CSSProperties = { width: 40, padding: "4px 4px", borderRadius: 6, background: "#0f0f0f", color: "#eaeaea", border: "1px solid #333", textAlign: "center" };
