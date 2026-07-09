import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMagnetic } from "../lib/hooks";

/* ── Button (magnetic optional) ─────────────────────────────────────── */
export function Button({ variant = "primary", size = "", magnetic = false, className = "", children, ...rest }) {
  const mag = useMagnetic(8);
  const magProps = magnetic ? mag : {};
  return (
    <button
      className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`}
      {...magProps}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Inputs ─────────────────────────────────────────────────────────── */
export function Field({ label, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      <AnimatePresence>{error && (
        <motion.span className="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {error}
        </motion.span>
      )}</AnimatePresence>
    </div>
  );
}

export function PasswordInput({ value, onChange, placeholder = "••••••••", error, autoComplete = "current-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        className={`input ${error ? "has-error" : ""}`}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ paddingRight: 44 }}
      />
      <button type="button" className="input-affix" onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" /><span className="thumb" />
      </span>
      {label && <span style={{ fontSize: 14 }}>{label}</span>}
    </label>
  );
}

/* ── Modal (portal + spring) ────────────────────────────────────────── */
export function Modal({ open, onClose, title, subtitle, children, width = 460 }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            className="modal-panel" style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.9, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                {title && <h3>{title}</h3>}
                {subtitle && <div className="sub">{subtitle}</div>}
              </div>
              <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Confirm dialog ─────────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", body, confirmLabel = "Delete", danger = true }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      {body && <p style={{ color: "var(--text-2)", fontSize: 14, margin: "6px 0 20px" }}>{body}</p>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } finally { setBusy(false); } }}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Toasts ─────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const TONE_ICON = { success: "🌸", error: "⚠️", info: "💡" };
const TONE_COLOR = { success: "var(--good)", error: "var(--danger)", info: "var(--primary)" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((tone, title, body) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, tone, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const toast = {
    success: (t, b) => push("success", t, b),
    error: (t, b) => push("error", t, b),
    info: (t, b) => push("info", t, b),
  };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toasts">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id} className="toast" layout
                initial={{ opacity: 0, x: 60, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                style={{ borderLeft: `3px solid ${TONE_COLOR[t.tone]}` }}
              >
                <span className="t-icon">{TONE_ICON[t.tone]}</span>
                <span><b>{t.title}</b>{t.body && <span style={{ color: "var(--text-2)" }}>{t.body}</span>}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

/* ── Skeleton / Empty ───────────────────────────────────────────────── */
export function Skeleton({ w = "100%", h = 16, r = 12, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function EmptyState({ art = "🌷", title, body, action }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <motion.span
        className="art"
        animate={{ y: [0, -7, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {art}
      </motion.span>
      <b>{title}</b>
      <p>{body}</p>
      {action}
    </motion.div>
  );
}

/* ── Animated progress bar ──────────────────────────────────────────── */
export function Progress({ value, max = 100, color = "var(--primary)", height = 10, shimmer = true, over = false }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div className="progress-track" style={{ height }}>
      <motion.div
        className={`progress-fill ${shimmer ? "shimmer" : ""}`}
        style={{ background: over ? "var(--danger)" : color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 68, damping: 18, mass: 0.9 }}
      />
    </div>
  );
}

/* ── Page transition wrapper ────────────────────────────────────────── */
export function PageFade({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.995 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* staggered list container/item */
export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.055 } } },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
  },
};
