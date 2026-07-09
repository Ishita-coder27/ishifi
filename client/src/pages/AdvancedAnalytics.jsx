import { motion } from "framer-motion";
import { useState } from "react";
import { Button, Skeleton, stagger, useToast } from "../components/ui";
import { Bars } from "../components/charts";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { useFetch } from "../lib/hooks";

export default function AdvancedAnalytics() {
  const toast = useToast();
  const { data, loading, reload } = useFetch("/api/tier3/full-analysis");
  const [refreshing, setRefreshing] = useState(false);

  const analysis = data?.analysis || {};
  const health = analysis.financial_health || {};
  const forecast = analysis.savings_forecast?.forecast || [];
  const heatmap = analysis.spending_heatmap || {};
  const trends = analysis.category_trends || {};
  const optimization = analysis.spending_optimization || [];
  const predictions = analysis.goal_predictions || {};

  const refresh = async () => {
    setRefreshing(true);
    try {
      await reload();
      toast.success("Analysis refreshed", " Advanced analytics updated");
    } catch (e) {
      toast.error("Refresh failed", ` ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Skeleton h={40} w={400} />
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={160} r={22} />)}
    </div>;
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Advanced Analytics</h2>
          <div className="sub">Forecasting, trends, financial health, optimization</div>
        </div>
        <Button magnetic onClick={refresh} disabled={refreshing}>
          {refreshing ? "Analyzing..." : "Analyze"}
        </Button>
      </div>

      {/* FINANCIAL HEALTH SCORE */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <b style={{ fontSize: 15 }}>Financial Health Score</b>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Composite metric: savings + budgets + goals + consistency</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: getHealthColor(health.overall_score) }}>
              {health.overall_score}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: getHealthColor(health.overall_score) }}>
              Grade {health.grade}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {Object.entries(health.weights || {}).map(([key, val]) => (
            <div key={key} style={{ padding: 12, background: "var(--surface-2)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize", marginBottom: 6 }}>
                {key.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {val.score}/{val.target}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
                {typeof val.status === "string" ? val.status : `${val.completed || 0} completed`}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* SAVINGS FORECAST */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>Savings Forecast (6 months)</b>
          {forecast.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Need more history to forecast</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {forecast.slice(0, 3).map((month, i) => (
                <div key={i} style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{month.month}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--good)" }}>
                    {money(month.predicted_savings)}/month
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                    Cumulative: {money(month.cumulative_savings)}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: 10, background: "var(--primary-soft)", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                12-Month Forecast: {money(analysis.savings_forecast?.total_12month_forecast || 0)}
              </div>
            </div>
          )}
        </motion.div>

        {/* CATEGORY TRENDS */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>Category Trends (MoM %)</b>
          {Object.entries(trends).length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>No trends yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(trends)
                .slice(0, 5)
                .map(([cat, data]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <b style={{ fontSize: 13, textTransform: "capitalize" }}>{cat}</b>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {money(data.previous_month)} → {money(data.current_month)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: data.change_percent > 0 ? "var(--danger)" : "var(--good)"
                    }}>
                      {data.direction} {Math.abs(data.change_percent)}%
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* PEAK SPENDING TIMES */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>Peak Spending Times</b>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Peak hour</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {heatmap.peak_hour ? `${heatmap.peak_hour}:00` : "—"}
              </div>
            </div>
            <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Peak day</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{heatmap.peak_day || "—"}</div>
            </div>
            <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Peak month</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{heatmap.peak_month || "—"}</div>
            </div>
          </div>
        </motion.div>

        {/* OPTIMIZATION OPPORTUNITIES */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>Spending Optimization</b>
          {optimization.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Spending is optimized</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {optimization.slice(0, 3).map((opt) => (
                <div key={opt.category} style={{ padding: 10, background: "var(--warn-soft)", borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", marginBottom: 4 }}>
                    {opt.category}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--warn)" }}>
                    Could save {money(opt.annual_savings)}/year
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {opt.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* GOAL PREDICTIONS */}
      {Object.keys(predictions).length > 0 && (
        <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>Goal Achievement Timeline</b>
          <div className="grid cols-3">
            {Object.entries(predictions).map(([gid, pred]) => (
              <div key={gid} style={{ padding: 12, background: "var(--surface-2)", borderRadius: 12 }}>
                <b style={{ fontSize: 13, marginBottom: 6, display: "block" }}>{pred.goal_name}</b>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {pred.months_to_achievement} months
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                  By {new Date(pred.predicted_date).toLocaleDateString()}
                </div>
                <div style={{
                  fontSize: 11,
                  padding: 4,
                  background: pred.on_track ? "var(--good-soft)" : "var(--warn-soft)",
                  color: pred.on_track ? "var(--good)" : "var(--warn)",
                  borderRadius: 6,
                  textAlign: "center"
                }}>
                  {pred.on_track ? "On track" : "At risk"}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* HOW IT WORKS */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ background: "var(--surface-2)" }}>
        <b style={{ fontSize: 14, marginBottom: 10 }}>Advanced Analytics Explained</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: "var(--text)" }}>Financial Health:</b> Composite of savings rate (30%), budget adherence (25%), goal progress (25%), spending consistency (20%).
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: "var(--text)" }}>Forecasting:</b> Projects savings for next 6/12 months using historical averages.
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: "var(--text)" }}>Trends:</b> Category spending change month-over-month with % direction.
          </div>
          <div>
            <b style={{ color: "var(--text)" }}>Optimization:</b> Identifies high-variance categories with saving potential.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getHealthColor(score) {
  if (score >= 80) return "var(--good)";
  if (score >= 60) return "var(--warn)";
  return "var(--danger)";
}
