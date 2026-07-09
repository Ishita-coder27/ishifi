import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import TxModal from "../components/TxModal";
import { Button, ConfirmDialog, EmptyState, Skeleton, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useCategories } from "../lib/categories";
import { money, niceDate } from "../lib/format";
import { useDebounced } from "../lib/hooks";

const SORTS = [
  { id: "-date", label: "Newest" },
  { id: "date", label: "Oldest" },
  { id: "-amount", label: "Biggest" },
  { id: "amount", label: "Smallest" },
];

export default function Transactions() {
  const toast = useToast();
  const { categories, info } = useCategories();
  const [view, setView] = useState(() => localStorage.getItem("aurum-tx-view") || "list");
  const [search, setSearch] = useState("");
  const dSearch = useDebounced(search);
  const [type, setType] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sort, setSort] = useState("-date");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [editTx, setEditTx] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // tx | "bulk"

  const query = useMemo(() => {
    const p = new URLSearchParams({ page, limit: 12, sort });
    if (dSearch) p.set("search", dSearch);
    if (type) p.set("type", type);
    if (catFilter) p.set("category", catFilter);
    return p.toString();
  }, [page, sort, dSearch, type, catFilter]);

  useEffect(() => { setPage(1); }, [dSearch, type, catFilter, sort]);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.get(`/api/transactions?${query}`));
      setSelected(new Set());
    } catch (e) {
      toast.error("Couldn't load transactions", ` ${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleView = (v) => { setView(v); localStorage.setItem("aurum-tx-view", v); };
  const toggleSelect = (id) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const doDelete = async () => {
    if (confirmDel === "bulk") {
      const res = await api.post("/api/transactions/bulk-delete", { ids: [...selected] });
      toast.success(`Deleted ${res.deleted} transactions`);
    } else {
      await api.del(`/api/transactions/${confirmDel.id}`);
      toast.success("Deleted", " Transaction removed.");
    }
    load();
  };

  const items = data?.items || [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Transactions</h2>
          <div className="sub">{data ? `${data.total} on record` : " "}</div>
        </div>
        <Button magnetic onClick={() => { setEditTx(null); setModalOpen(true); }}>＋ Add transaction</Button>
      </div>

      {/* toolbar */}
      <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="input-wrap" style={{ flex: "1 1 220px" }}>
          <input className="input" placeholder="🔍 Search notes or categories…" value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: search ? 40 : 16 }} />
          {search && <button className="input-affix" onClick={() => setSearch("")}>✕</button>}
        </div>
        <select className="input" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="expense">💸 Expenses</option>
          <option value="income">💰 Income</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {/* view toggle */}
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 3, marginLeft: "auto" }}>
          {["list", "grid"].map((v) => (
            <button key={v} onClick={() => toggleView(v)} style={{
              position: "relative", border: "none", background: "none", cursor: "pointer",
              padding: "7px 13px", borderRadius: 9, fontSize: 14, zIndex: 1,
              color: view === v ? "var(--text)" : "var(--muted)",
            }}>
              {view === v && <motion.span layoutId="txview" style={{
                position: "absolute", inset: 0, background: "var(--surface)", borderRadius: 9,
                boxShadow: "var(--shadow-1)", zIndex: -1,
              }} transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              {v === "list" ? "☰" : "▦"}
            </button>
          ))}
        </div>
      </div>

      {/* bulk actions bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 12 }}
          >
            <div className="card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderColor: "var(--primary)" }}>
              <b style={{ fontSize: 13.5 }}>{selected.size} selected</b>
              <Button size="sm" variant="danger" onClick={() => setConfirmDel("bulk")}>Delete selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid" style={{ gap: 10 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} h={64} r={16} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState art="🧾" title="Nothing here"
            body={dSearch || type || catFilter ? "No transactions match these filters." : "Add your first transaction to get rolling."}
            action={<Button onClick={() => setModalOpen(true)}>＋ Add transaction</Button>} />
        </div>
      ) : view === "list" ? (
        <div className="card" style={{ padding: 8 }}>
          <AnimatePresence initial={false}>
            {items.map((t, i) => {
              const c = info(t.category);
              const sel = selected.has(t.id);
              return (
                <motion.div key={t.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.03, duration: 0.28 }}
                  className="tx-row"
                  style={{
                    gridTemplateColumns: "24px 44px 1fr auto auto",
                    background: sel ? "var(--primary-soft)" : undefined,
                  }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleSelect(t.id)}
                    style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                  <span className="tx-ico" style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <div className="tx-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.note || c.name}
                    </div>
                    <div className="tx-meta">{c.name} · {niceDate(t.date)}</div>
                  </span>
                  <span className={`tx-amt num ${t.type === "income" ? "income" : ""}`}>
                    {t.type === "income" ? "+" : "−"}{money(t.amount)}
                  </span>
                  <span style={{ display: "flex", gap: 2 }}>
                    <button className="btn-icon" title="Edit" onClick={() => { setEditTx(t); setModalOpen(true); }}><Icon name="edit" size={18} /></button>
                    <button className="btn-icon" title="Delete" onClick={() => setConfirmDel(t)}><Icon name="delete" size={18} /></button>
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid cols-3">
          {items.map((t, i) => {
            const c = info(t.category);
            const sel = selected.has(t.id);
            return (
              <motion.div key={t.id} layout className="card card-pad hoverable"
                initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                style={{ borderColor: sel ? "var(--primary)" : undefined, cursor: "pointer" }}
                onClick={() => toggleSelect(t.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="tx-ico" style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
                  <span style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => { setEditTx(t); setModalOpen(true); }}>✏️</button>
                    <button className="btn-icon" onClick={() => setConfirmDel(t)}>🗑️</button>
                  </span>
                </div>
                <div className={`num`} style={{ fontSize: 21, fontWeight: 700, color: t.type === "income" ? "var(--good)" : "var(--text)" }}>
                  {t.type === "income" ? "+" : "−"}{money(t.amount)}
                </div>
                <div className="tx-name" style={{ marginTop: 2 }}>{t.note || c.name}</div>
                <div className="tx-meta">{c.name} · {niceDate(t.date)}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, alignItems: "center" }}>
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</Button>
          <span style={{ fontSize: 13.5, color: "var(--text-2)" }} className="num">{page} / {data.pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</Button>
        </div>
      )}

      <TxModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load}
        categories={categories} initial={editTx} />
      <ConfirmDialog
        open={Boolean(confirmDel)}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        title={confirmDel === "bulk" ? `Delete ${selected.size} transactions?` : "Delete this transaction?"}
        body="This can't be undone."
      />
    </div>
  );
}
