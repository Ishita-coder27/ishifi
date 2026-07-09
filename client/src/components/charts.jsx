import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { money, moneyShort } from "../lib/format";

/* Handcrafted SVG charts — all animation transform/opacity/pathLength based. */

const EASE = [0.22, 1, 0.36, 1];

function useTooltip() {
  const [tip, setTip] = useState(null); // {x, y, html}
  const show = (evt, content) => {
    const box = evt.currentTarget.closest(".chart-box").getBoundingClientRect();
    setTip({ x: evt.clientX - box.left, y: evt.clientY - box.top, content });
  };
  return { tip, show, hide: () => setTip(null) };
}

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div style={{
      position: "absolute", left: tip.x + 12, top: tip.y + 12, zIndex: 5, pointerEvents: "none",
      background: "var(--surface)", border: "1px solid var(--border-strong)",
      borderRadius: 12, padding: "8px 12px", fontSize: 12.5, boxShadow: "var(--shadow-2)",
      whiteSpace: "nowrap",
    }}>
      {tip.content}
    </div>
  );
}

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C ${mx} ${pts[i - 1][1]}, ${mx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}

/* ── Sparkline ──────────────────────────────────────────────────────── */
export function Sparkline({ data, color = "var(--primary)", w = 130, h = 40, fill = true }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * w,
    h - 4 - (v / max) * (h - 10),
  ]);
  const d = smooth(pts);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      {fill && (
        <motion.path
          d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={color} opacity={0.12}
          initial={{ opacity: 0 }} animate={{ opacity: 0.12 }} transition={{ delay: 0.5 }}
        />
      )}
      <motion.path
        d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </svg>
  );
}

/* ── Area chart (income vs expense) ─────────────────────────────────── */
export function AreaChart({ series, labels, height = 260, colors = ["var(--good)", "var(--primary)"], names = ["Income", "Spending"] }) {
  const W = 720, H = height, L = 52, R = 14, T = 16, B = 30;
  const pw = W - L - R, ph = H - T - B;
  const { tip, show, hide } = useTooltip();
  const svgRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);

  const n = labels.length;
  const yMax = Math.max(...series.flat(), 1) * 1.14;
  const X = (i) => L + (i / Math.max(n - 1, 1)) * pw;
  const Y = (v) => T + ph - (v / yMax) * ph;

  const paths = series.map((s) => smooth(s.map((v, i) => [X(i), Y(v)])));

  const onMove = (e) => {
    const svg = svgRef.current;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let i = Math.round(((px - L) / pw) * (n - 1));
    i = Math.max(0, Math.min(i, n - 1));
    setHoverI(i);
    show(e, (
      <>
        <div style={{ color: "var(--muted)", fontSize: 11 }}>{labels[i]}</div>
        {series.map((s, si) => (
          <div key={si}><span className="dot" style={{ background: colors[si], marginRight: 6 }} />
            {names[si]} <b className="num">{money(s[i])}</b></div>
        ))}
      </>
    ));
  };

  return (
    <div className="chart-box" style={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
        onMouseMove={onMove} onMouseLeave={() => { hide(); setHoverI(null); }}>
        {[0, 1, 2, 3, 4].map((g) => {
          const v = (yMax / 4) * g, y = Y(v);
          return (
            <g key={g}>
              <line x1={L} y1={y} x2={W - R} y2={y} stroke="var(--border)" strokeDasharray={g ? "0" : "0"} />
              <text x={L - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">{moneyShort(v)}</text>
            </g>
          );
        })}
        {labels.map((lb, i) => (
          (n <= 8 || i % Math.ceil(n / 8) === 0) && (
            <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{lb}</text>
          )
        ))}
        {series.map((s, si) => (
          <g key={si}>
            <motion.path
              d={`${paths[si]} L ${X(n - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`}
              fill={colors[si]}
              initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ delay: 0.55, duration: 0.7 }}
            />
            <motion.path
              d={paths[si]} fill="none" stroke={colors[si]} strokeWidth="2.4" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.25, ease: EASE, delay: si * 0.12 }}
            />
          </g>
        ))}
        {hoverI != null && (
          <g>
            <line x1={X(hoverI)} y1={T} x2={X(hoverI)} y2={T + ph} stroke="var(--border-strong)" strokeDasharray="3 4" />
            {series.map((s, si) => (
              <circle key={si} cx={X(hoverI)} cy={Y(s[hoverI])} r="4.5" fill={colors[si]} stroke="var(--surface)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      <Tip tip={tip} />
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12.5, color: "var(--text-2)" }}>
        {names.map((nm, i) => (
          <span key={nm}><span className="dot" style={{ background: colors[i], marginRight: 6 }} />{nm}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut ──────────────────────────────────────────────────────────── */
export function Donut({ slices, size = 190, thickness = 26, centerLabel, centerSub }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  const { tip, show, hide } = useTooltip();
  let acc = 0;

  return (
    <div className="chart-box" style={{ position: "relative", width: size, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const offset = acc; acc += frac;
          return (
            <motion.circle
              key={s.label}
              cx={size / 2} cy={size / 2} r={R} fill="none"
              stroke={s.color} strokeWidth={thickness} strokeLinecap="round"
              strokeDasharray={`${Math.max(frac * C - 3, 0.001)} ${C}`}
              transform={`rotate(${offset * 360 - 90} ${size / 2} ${size / 2})`}
              initial={{ strokeDashoffset: frac * C }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.15 + i * 0.08 }}
              onMouseMove={(e) => show(e, (
                <><b>{s.label}</b> · {money(s.value)} ({Math.round(frac * 100)}%)</>
              ))}
              onMouseLeave={hide}
              style={{ cursor: "default" }}
            />
          );
        })}
        <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.115} fontWeight="700" fill="var(--text)">{centerLabel}</text>
        {centerSub && <text x="50%" y="58%" textAnchor="middle" fontSize="10.5" fill="var(--muted)">{centerSub}</text>}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ── Bars (month over month) ────────────────────────────────────────── */
export function Bars({ data, labels, color = "var(--primary)", height = 200, highlight = -1, format = money }) {
  const W = 460, H = height, L = 48, R = 8, T = 12, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const yMax = Math.max(...data, 1) * 1.12;
  const bw = Math.min(40, (pw / data.length) * 0.55);
  const { tip, show, hide } = useTooltip();

  return (
    <div className="chart-box" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {[0, 1, 2].map((g) => {
          const v = (yMax / 2) * g, y = T + ph - (v / yMax) * ph;
          return <g key={g}>
            <line x1={L} y1={y} x2={W - R} y2={y} stroke="var(--border)" />
            <text x={L - 7} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{moneyShort(v)}</text>
          </g>;
        })}
        {data.map((v, i) => {
          const cx = L + (pw / data.length) * (i + 0.5);
          const h = (v / yMax) * ph;
          const active = i === highlight;
          return (
            <g key={i}>
              <motion.rect
                x={cx - bw / 2} width={bw} rx={7}
                y={T + ph - h} height={h}
                fill={color} opacity={active ? 1 : 0.42}
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                style={{ transformOrigin: `${cx}px ${T + ph}px` }}
                transition={{ type: "spring", stiffness: 160, damping: 20, delay: i * 0.06 }}
                onMouseMove={(e) => show(e, <><b>{labels[i]}</b> · {format(v)}</>)}
                onMouseLeave={hide}
              />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5"
                fill={active ? "var(--text)" : "var(--muted)"} fontWeight={active ? 700 : 400}>
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ── Ring gauge (financial score) ───────────────────────────────────── */
export function RingGauge({ value, max = 100, size = 150, color = "var(--primary)", label, sub }) {
  const R = size / 2 - 12;
  const C = 2 * Math.PI * R;
  const frac = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={C}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - frac) }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.21} fontWeight="700" fill="var(--text)">{label ?? value}</text>
      {sub && <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.075} fill="var(--muted)">{sub}</text>}
    </svg>
  );
}

/* ── Calendar heatmap ───────────────────────────────────────────────── */
export function Heatmap({ days, weeks = 20 }) {
  // days: [{date: "YYYY-MM-DD", total}]
  const { tip, show, hide } = useTooltip();
  const map = useMemo(() => Object.fromEntries(days.map((d) => [d.date, d.total])), [days]);
  const cells = useMemo(() => {
    const out = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks * 7 - 1) - today.getDay());
    for (let i = 0; i < weeks * 7 + today.getDay() + 1; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ key, total: map[key] || 0, col: Math.floor(i / 7), row: i % 7 });
    }
    return out;
  }, [map, weeks]);
  const maxV = Math.max(...cells.map((c) => c.total), 1);
  const cols = (cells[cells.length - 1]?.col ?? 0) + 1;
  const CS = 13, GAP = 3.5;

  return (
    <div className="chart-box" style={{ position: "relative", overflowX: "auto" }}>
      <svg width={cols * (CS + GAP)} height={7 * (CS + GAP)} style={{ display: "block" }}>
        {cells.map((c, i) => {
          const alpha = c.total ? 0.25 + (c.total / maxV) * 0.75 : 0;
          return (
            <motion.rect
              key={c.key}
              x={c.col * (CS + GAP)} y={c.row * (CS + GAP)}
              width={CS} height={CS} rx={4}
              fill={c.total ? "var(--primary)" : "var(--surface-2)"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: c.total ? alpha : 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.004, 0.5), duration: 0.3 }}
              style={{ transformOrigin: `${c.col * (CS + GAP) + CS / 2}px ${c.row * (CS + GAP) + CS / 2}px` }}
              onMouseMove={(e) => show(e, <><b>{c.key}</b> · {c.total ? money(c.total) : "no spend"}</>)}
              onMouseLeave={hide}
            />
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}
