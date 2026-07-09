import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Celebrations: confetti (goal milestones) + coin burst (income logged).
   Fire-and-forget through context: const fx = useFx(); fx.confetti(); fx.coins(x, y); */

const FxCtx = createContext(null);
export const useFx = () => useContext(FxCtx);

const CONFETTI_COLORS = ["#FF6FAE", "#FFD6C2", "#DCCEFF", "#FFC94D", "#7FD8BE", "#FFB3C7"];

function rand(a, b) { return a + Math.random() * (b - a); }

export function FxProvider({ children }) {
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);

  const spawn = useCallback((kind, opts = {}) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = ++idRef.current;
    setBursts((b) => [...b, { id, kind, ...opts }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2600);
  }, []);

  const fx = {
    confetti: () => spawn("confetti"),
    coins: (x = innerWidth / 2, y = innerHeight / 2) => spawn("coins", { x, y }),
  };

  return (
    <FxCtx.Provider value={fx}>
      {children}
      {createPortal(
        <AnimatePresence>
          {bursts.map((b) => (
            <div key={b.id} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200 }}>
              {b.kind === "confetti" ? <ConfettiPieces /> : <CoinPieces x={b.x} y={b.y} />}
            </div>
          ))}
        </AnimatePresence>,
        document.body
      )}
    </FxCtx.Provider>
  );
}

function ConfettiPieces() {
  const pieces = Array.from({ length: 52 }, (_, i) => ({
    x: rand(6, 94),
    delay: rand(0, 0.35),
    dur: rand(1.5, 2.3),
    size: rand(7, 13),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    drift: rand(-90, 90),
    spin: rand(240, 720) * (Math.random() > 0.5 ? 1 : -1),
    round: Math.random() > 0.6,
  }));
  return pieces.map((p, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 1, x: 0, y: -30, rotate: 0 }}
      animate={{ opacity: [1, 1, 0], y: innerHeight + 60, x: p.drift, rotate: p.spin }}
      transition={{ duration: p.dur, delay: p.delay, ease: [0.32, 0.2, 0.6, 1] }}
      style={{
        position: "absolute", top: 0, left: `${p.x}%`,
        width: p.size, height: p.size * (p.round ? 1 : 0.55),
        borderRadius: p.round ? "50%" : 3,
        background: p.color,
      }}
    />
  ));
}

function CoinPieces({ x, y }) {
  const coins = Array.from({ length: 14 }, () => ({
    dx: rand(-130, 130),
    dy: rand(-190, -70),
    dur: rand(0.9, 1.4),
    size: rand(16, 26),
    delay: rand(0, 0.12),
  }));
  return coins.map((c, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 0, x, y, scale: 0.4 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: x + c.dx,
        y: [y, y + c.dy, y + c.dy + 130],
        scale: 1,
        rotateY: 540,
      }}
      transition={{ duration: c.dur, delay: c.delay, ease: [0.24, 0.9, 0.42, 1] }}
      style={{
        position: "absolute", top: 0, left: 0,
        width: c.size, height: c.size, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: c.size * 0.55, fontWeight: 700, color: "#8a6420",
        background: "radial-gradient(circle at 32% 30%, #FFE9B8, #F5C443 55%, #D99B23)",
        boxShadow: "inset 0 -2px 4px rgba(120,70,0,0.35), 0 4px 10px rgba(0,0,0,0.18)",
      }}
    >
      ₹
    </motion.span>
  ));
}
