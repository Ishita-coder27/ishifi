import Icon from "../components/Icon";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, ConfirmDialog, Field, Modal, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useCategories } from "../lib/categories";
import { money } from "../lib/format";

const CAT_ICONS = ["🍜", "🚕", "🛒", "🛍️", "🏠", "💡", "🎬", "💊", "📈", "💼", "✨", "🎮", "📚", "🐾", "☕", "🎁"];
const CAT_COLORS = ["#FF6FAE", "#7FB5FF", "#5BC8AF", "#C79BFF", "#FFA26B", "#FFC94D", "#FF8FA3", "#6BD1E8", "#77C97F", "#BBA88E"];

export default function Categories() {
  const toast = useToast();
  const { categories, reload } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const maxSpent = Math.max(...categories.map((c) => c.totalSpent || 0), 1);

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Categories</h2>
          <div className="sub">Your money's filing system — make it yours.</div>
        </div>
        <Button magnetic onClick={() => { setEditCat(null); setModalOpen(true); }}>＋ New category</Button>
      </div>

      <div className="grid cols-3">
        {categories.map((c) => (
          <motion.div key={c.id} className="card card-pad hoverable" variants={stagger.item}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="tx-ico" style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14.5 }}>{c.name}</b>
                <div className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {c.totalSpent ? `${money(c.totalSpent)} all-time` : "no spending yet"}
                </div>
              </div>
              <button className="btn-icon" onClick={() => { setEditCat(c); setModalOpen(true); }}><Icon name="edit" size={18} /></button>
              {c.slug !== "other" && c.slug !== "salary" && (
                <button className="btn-icon" onClick={() => setConfirmDel(c)}><Icon name="delete" size={18} /></button>
              )}
            </div>
            <div style={{ marginTop: 12, height: 6, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", borderRadius: 5, background: c.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((c.totalSpent || 0) / maxSpent * 100, c.totalSpent ? 4 : 0)}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 18 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <CategoryModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload}
        editCat={editCat} toast={toast} />
      <ConfirmDialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          await api.del(`/api/categories/${confirmDel.id}`);
          toast.success("Category removed", " Its transactions moved to Other.");
          reload();
        }}
        title={`Delete "${confirmDel?.name}"?`}
        body="Existing transactions in it will be re-filed under ✨ Other." />
    </motion.div>
  );
}

function CategoryModal({ open, onClose, onSaved, editCat, toast }) {
  const editing = Boolean(editCat?.id);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [color, setColor] = useState(CAT_COLORS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editCat?.name || "");
      setIcon(editCat?.icon || "✨");
      setColor(editCat?.color || CAT_COLORS[0]);
    }
  }, [open, editCat]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await api.patch(`/api/categories/${editCat.id}`, { name: name.trim(), icon, color });
        toast.success("Category updated");
      } else {
        await api.post("/api/categories", { name: name.trim(), icon, color });
        toast.success("Category created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Couldn't save", ` ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit category" : "New category"}
      subtitle="Pick a face and a color.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Pets, Coffee, Hobbies…" autoFocus required maxLength={40} />
        </Field>
        <Field label="Icon">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CAT_ICONS.map((i) => (
              <motion.button key={i} type="button" whileTap={{ scale: 0.85 }} onClick={() => setIcon(i)}
                style={{
                  width: 38, height: 38, fontSize: 18, borderRadius: 11, cursor: "pointer",
                  border: `2px solid ${icon === i ? "var(--primary)" : "var(--border)"}`,
                  background: icon === i ? "var(--primary-soft)" : "var(--surface)",
                }}>
                {i}
              </motion.button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CAT_COLORS.map((c) => (
              <motion.button key={c} type="button" whileTap={{ scale: 0.85 }} onClick={() => setColor(c)}
                style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer", background: c,
                  border: "3px solid", borderColor: color === c ? "var(--text)" : "transparent",
                }} />
            ))}
          </div>
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create category"}</Button>
      </form>
    </Modal>
  );
}
