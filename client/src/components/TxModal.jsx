import Icon from "./Icon";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { todayISO } from "../lib/format";
import { useFx } from "./effects";
import { Button, Field, Modal, useToast } from "./ui";

/* Add / edit transaction dialog. Fires a coin burst when income is logged. */
export default function TxModal({ open, onClose, onSaved, categories, initial }) {
  const editing = Boolean(initial?.id);
  const toast = useToast();
  const fx = useFx();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initial?.type || "expense");
      setAmount(initial?.amount ?? "");
      setCategory(initial?.category || (initial?.type === "income" ? "salary" : "food"));
      setNote(initial?.note || "");
      setDate(initial?.date ? initial.date.slice(0, 10) : todayISO());
      setErrors({});
    }
  }, [open, initial]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) errs.amount = "Enter an amount above zero";
    if (!category) errs.category = "Pick a category";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { type, amount: amt, category, note: note.trim(), date: `${date}T12:00:00` };
      if (editing) {
        await api.patch(`/api/transactions/${initial.id}`, body);
        toast.success("Updated", " Transaction saved.");
      } else {
        await api.post("/api/transactions", body);
        if (type === "income") {
          fx.coins(innerWidth / 2, innerHeight / 2);
          toast.success("Income logged", " Lovely to see money coming in.");
        } else {
          toast.success("Logged", " Transaction added.");
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Couldn't save", ` ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const visibleCats = categories.filter((c) =>
    type === "income" ? true : c.slug !== "salary"
  );

  return (
    <Modal open={open} onClose={onClose}
      title={editing ? "Edit transaction" : "Add transaction"}
      subtitle={editing ? "Adjust the details below" : "Log it in seconds"}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* type toggle */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4,
          background: "var(--surface-2)", borderRadius: 14, position: "relative",
        }}>
          {["expense", "income"].map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              style={{
                position: "relative", zIndex: 1, border: "none", background: "none",
                padding: "9px 0", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14,
                color: type === t ? "var(--on-primary)" : "var(--text-2)",
                transition: "color 0.25s",
              }}>
              {type === t && (
                <motion.span layoutId="txtype" style={{
                  position: "absolute", inset: 0, zIndex: -1, borderRadius: 11,
                  background: t === "income"
                    ? "linear-gradient(135deg, var(--good), color-mix(in srgb, var(--good) 70%, #fff))"
                    : "linear-gradient(135deg, var(--primary), var(--primary-2))",
                }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              {t === "expense" ? "💸 Expense" : "💰 Income"}
            </button>
          ))}
        </div>

        <Field label="Amount" error={errors.amount}>
          <input className={`input num ${errors.amount ? "has-error" : ""}`} type="number" step="0.01" min="0"
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus
            style={{ fontSize: 20, fontWeight: 700 }} />
        </Field>

        <Field label="Category" error={errors.category}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {visibleCats.map((c) => (
              <motion.button
                key={c.slug} type="button" whileTap={{ scale: 0.94 }}
                onClick={() => setCategory(c.slug)}
                className="tag"
                style={{
                  cursor: "pointer", fontSize: 12.5, padding: "6px 12px",
                  background: category === c.slug ? c.color + "26" : "var(--surface-2)",
                  borderColor: category === c.slug ? c.color : "var(--border)",
                  color: category === c.slug ? "var(--text)" : "var(--text-2)",
                }}
              >
                <span style={{ display: "inline-block", marginRight: 4, fontWeight: 700 }}>{c.icon}</span> {c.name}
              </motion.button>
            ))}
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date">
            <input className="input" type="date" value={date} max={todayISO()}
              onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="swiggy dinner…" maxLength={120} />
          </Field>
        </div>

        <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? "Saving…" : editing ? "Save changes" : type === "income" ? "Add income 💰" : "Add expense"}
        </Button>
      </form>
    </Modal>
  );
}
