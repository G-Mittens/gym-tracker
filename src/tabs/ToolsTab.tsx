import React from "react";

interface Props { card: React.CSSProperties; }

export const ToolsTab: React.FC<Props> = ({ card }) => {
  return (
    <section style={card}>
      <h2 style={{ marginTop: 0 }}>Tools</h2>
      <div style={{ opacity: 0.8, fontSize: 14 }}>Coming soon: plate calculator, 1RM estimator, and more.</div>
    </section>
  );
};
