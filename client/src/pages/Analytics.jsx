import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AreaChart, Bars, Donut, Heatmap, RingGauge } from "../components/charts";
import { Skeleton, stagger } from "../components/ui";
import { useCategories } from "../lib/categories";
import { money, monthLabel } from "../lib/format";
import { useFetch } from "../lib/hooks";

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Analytics() {
  const [month, setMonth] = useState(currentYM());
  const { data: summary, loading: l1 } = useFetch(`/api/analytics/summary?month=${month}`, [month]);
  const { data: trendData, loading: l2 } = useFetch("/api/analytics/trends?months=6");
  const { data: dailyData } = useFetch(`/api/analytics/daily?month=${month}`, [month]);
  const { data: heat } = useFetch("/api/analytics/heatmap?weeks=20");
  const { data: scoreData } = useFetch("/api/analytics/score");
  const { info } = useCategories();

  const trends = trendData?.trends || [];
  const monthOptions = useMemo(() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() - 1);
    }
    return out;
  }, []);

  // daily cumulative for the area chart
  const daily = dailyData?.days || [];
  const cumSeries = useMemo(() => {
    if (!daily.length) return null;
    const labels = daily.map((d) => d.date.slice(8));
    let accE = 0, accI = 0;
    const exp = daily.map((d) => (accE += d.expense || 0));
    const inc = daily.map((d) => (accI += d.income || 0));
    return { labels, exp, inc };
  }, [daily]);

  const slices = (summary?.byCategory || []).slice(0, 6).map((c) => ({
    label: info(c.category).name,
    value: c.total,
    color: info(c.category).color,
  }));

  const score = scoreData?.score ?? 0;
  const scoreColor = score >= 80 ? "var(--good)" : score >= 55 ? "var(--warn)" : "var(--danger)";

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Analytics</h2>
          <div className="sub">The shape of your money, drawn beautifully.</div>
        </div>
        <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      {/* headline stats + score */}
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        {l1 ? [1, 2, 3].map((i) => <Skeleton key={i} h={104} r={22} />) : (
          <>
            <motion.div className="card card-pad hoverable" variants={stagger.item}>
              <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Income</div>
              <div className="num" style={{ fontSize: 25, fontWeight: 700, color: "var(--good)", marginTop: 5 }}>{money(summary?.income)}</div>
            </motion.div>
            <motion.div className="card card-pad hoverable" variants={stagger.item}>
              <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Spending</div>
              <div className="num" style={{ fontSize: 25, fontWeight: 700, marginTop: 5 }}>{money(summary?.expense)}</div>
            </motion.div>
            <motion.div className="card card-pad hoverable" variants={stagger.item}>
              <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Saved</div>
              <div className="num" style={{ fontSize: 25, fontWeight: 700, color: (summary?.net ?? 0) >= 0 ? "var(--good)" : "var(--danger)", marginTop: 5 }}>
                {money(summary?.net)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{summary?.savingsRate}% savings rate</div>
            </motion.div>
          </>
        )}
        <motion.div className="card card-pad hoverable" variants={stagger.item}
          style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <RingGauge value={score} size={86} color={scoreColor} label={score} />
          <div>
            <b style={{ fontSize: 14 }}>Financial score</b>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>grade {scoreData?.grade ?? "—"}</div>
          </div>
        </motion.div>
      </div>

      {/* cumulative cashflow */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
        <b style={{ fontSize: 15 }}>Cashflow through {monthLabel(month)}</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>cumulative income vs spending, day by day</div>
        {cumSeries ? (
          <AreaChart labels={cumSeries.labels} series={[cumSeries.inc, cumSeries.exp]} />
        ) : (
          <div className="empty" style={{ padding: 30 }}><b>No activity this month</b><p>Log transactions to see the flow.</p></div>
        )}
      </motion.div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* category breakdown */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15 }}>Where it went</b>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>top categories · {monthLabel(month)}</div>
          {slices.length ? (
            <>
              <Donut slices={slices} centerLabel={money(summary?.expense)} centerSub="spent" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {slices.map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                    <span className="dot" style={{ background: s.color }} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <b className="num">{money(s.value)}</b>
                    <span style={{ color: "var(--muted)", width: 38, textAlign: "right" }} className="num">
                      {Math.round((s.value / (summary?.expense || 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 26 }}><b>Nothing to slice yet</b><p>Expenses will appear here as a donut.</p></div>
          )}
        </motion.div>

        {/* month over month + score parts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <motion.div className="card card-pad" variants={stagger.item}>
            <b style={{ fontSize: 15 }}>Spending · last 6 months</b>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>hover a bar for details</div>
            {l2 ? <Skeleton h={180} /> : (
              <Bars
                data={trends.map((t) => t.expense)}
                labels={trends.map((t) => monthLabel(t.month).slice(0, 3))}
                highlight={trends.findIndex((t) => t.month === month)}
              />
            )}
          </motion.div>
          <motion.div className="card card-pad" variants={stagger.item}>
            <b style={{ fontSize: 15 }}>Savings growth</b>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>net saved per month</div>
            {l2 ? <Skeleton h={120} /> : (
              <Bars
                data={trends.map((t) => Math.max(t.net, 0))}
                labels={trends.map((t) => monthLabel(t.month).slice(0, 3))}
                color="var(--good)" height={150}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* heatmap */}
      <motion.div className="card card-pad" variants={stagger.item}>
        <b style={{ fontSize: 15 }}>Spending heatmap</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>last 20 weeks — darker means heavier days</div>
        <Heatmap days={heat?.days || []} weeks={20} />
      </motion.div>
    </motion.div>
  );
}
