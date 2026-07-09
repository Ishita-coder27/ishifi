import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "../components/charts";
import Icon from "../components/Icon";
import TxModal from "../components/TxModal";
import { Button, Progress, Skeleton, stagger } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useCategories } from "../lib/categories";
import { money, niceDate } from "../lib/format";
import { useCountUp, useFetch } from "../lib/hooks";

const TONE = {
  good: { bg: "var(--good-soft)", color: "var(--good)" },
  warn: { bg: "var(--warn-soft)", color: "var(--warn)" },
  info: { bg: "var(--primary-soft)", color: "var(--primary-2)" },
};

function Stat({ label, value, sub, icon, delay = 0 }) {
  const v = useCountUp(value);
  return (
    <motion.div className="card card-pad hoverable" variants={stagger.item}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="num" style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em" }}>{money(v)}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>{sub}</div>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, reload } = useFetch("/api/dashboard");
  const { categories, info } = useCategories();
  const [modal, setModal] = useState(null); // "expense" | "income" | null

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "").split(" ")[0];

  if (loading || !data) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <Skeleton h={34} w={280} />
        <div className="grid cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={110} r={22} />)}</div>
        <div className="grid cols-2"><Skeleton h={300} r={22} /><Skeleton h={300} r={22} /></div>
      </div>
    );
  }

  const budgetPct = data.budget ? Math.min(data.monthSpent / data.budget * 100, 100) : 0;
  const over = data.budget && data.monthSpent > data.budget;
  const savingsRate = data.monthIncome > 0
    ? Math.max(Math.round((data.monthIncome - data.monthSpent) / data.monthIncome * 100), 0) : null;

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>{greeting}, {firstName} 🌷</h2>
          <div className="sub">Here's how your money is doing today.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="soft" onClick={() => setModal("income")}>💰 Add income</Button>
          <Button magnetic onClick={() => setModal("expense")}>＋ Add expense</Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat label="Spent today" value={data.todaySpent} icon="☀️"
          sub={data.todaySpent === 0 ? "a no-spend day so far ✨" : "logged today"} />
        <Stat label="This month" value={data.monthSpent} icon="🗓️"
          sub={data.budget ? `${Math.round(budgetPct)}% of ${money(data.budget)} budget` : "no budget set yet"} />
        <Stat label="Income" value={data.monthIncome} icon="💼" sub={data.month} />
        <motion.div className="card card-pad hoverable" variants={stagger.item}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Savings rate</span>
            <span style={{ fontSize: 18 }}>🌱</span>
          </div>
          <div className="num" style={{ fontSize: 27, fontWeight: 700, color: savingsRate >= 20 ? "var(--good)" : "var(--text)" }}>
            {savingsRate == null ? "—" : `${savingsRate}%`}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>
            {savingsRate == null ? "log income to see this" : savingsRate >= 20 ? "healthy and growing" : "room to grow"}
          </div>
        </motion.div>
      </div>

      {/* budget bar */}
      {data.budget > 0 && (
        <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "baseline" }}>
            <b style={{ fontSize: 15 }}>Monthly budget</b>
            <span style={{ fontSize: 13.5, color: over ? "var(--danger)" : "var(--text-2)" }} className="num">
              {over ? `${money(data.monthSpent - data.budget)} over` : `${money(data.budgetRemaining)} left`}
            </span>
          </div>
          <Progress value={data.monthSpent} max={data.budget} over={over}
            color={budgetPct > 80 ? "var(--warn)" : "var(--primary)"} height={13} />
        </motion.div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* recent activity */}
        <motion.div className="card" variants={stagger.item} style={{ padding: "18px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px 10px", alignItems: "center" }}>
            <b style={{ fontSize: 15 }}>Recent activity</b>
            <Link to="/app/transactions" style={{ fontSize: 13, color: "var(--primary-2)", fontWeight: 600, textDecoration: "none" }}>See all →</Link>
          </div>
          {data.recent.length === 0 && (
            <div className="empty" style={{ padding: "26px 16px" }}>
              <b>No transactions yet</b>
              <p>Add your first one and watch this come alive.</p>
            </div>
          )}
          {data.recent.map((t, i) => {
            const c = info(t.category);
            return (
              <motion.div key={t.id} className="tx-row"
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}>
                <span className="tx-ico" style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
                <span>
                  <div className="tx-name">{t.note || c.name}</div>
                  <div className="tx-meta">{c.name} · {niceDate(t.date)}</div>
                </span>
                <span className={`tx-amt num ${t.type === "income" ? "income" : ""}`}>
                  {t.type === "income" ? "+" : "−"}{money(t.amount)}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 14-day mini analytics */}
          <motion.div className="card card-pad hoverable" variants={stagger.item}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 15 }}>Last 14 days</b>
              <Link to="/app/analytics" style={{ fontSize: 13, color: "var(--primary-2)", fontWeight: 600, textDecoration: "none" }}>Analytics →</Link>
            </div>
            <Sparkline data={data.spark.map((d) => d.total)} w={430} h={74} />
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
              daily spending · peaks {money(Math.max(...data.spark.map((d) => d.total)))}
            </div>
          </motion.div>

          {/* goals */}
          <motion.div className="card card-pad" variants={stagger.item}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 15 }}>Savings goals</b>
              <Link to="/app/goals" style={{ fontSize: 13, color: "var(--primary-2)", fontWeight: 600, textDecoration: "none" }}>All goals →</Link>
            </div>
            {data.goals.length === 0 && (
              <div style={{ fontSize: 13.5, color: "var(--text-2)" }}>
                No goals yet — <Link to="/app/goals" style={{ color: "var(--primary-2)" }}>dream one up</Link> 🎯
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {data.goals.map((g) => (
                <div key={g.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                    <span>{g.icon} <b>{g.name}</b></span>
                    <span className="num" style={{ color: "var(--text-2)" }}>
                      {money(g.saved)} / {money(g.target)}
                    </span>
                  </div>
                  <Progress value={g.saved} max={g.target} color={g.color} height={9} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* insights */}
      <motion.div variants={stagger.item}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 10 }}>Insights</b>
        <div className="grid cols-2">
          {data.insights.map((ins, i) => (
            <motion.div key={i} className="card card-pad hoverable"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{
                width: 38, height: 38, borderRadius: 12, flex: "0 0 auto", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 17,
                background: TONE[ins.tone].bg,
              }}>{ins.icon}</span>
              <span style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>{ins.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <TxModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        onSaved={reload}
        categories={categories}
        initial={modal === "income" ? { type: "income", category: "salary" } : null}
      />
    </motion.div>
  );
}
