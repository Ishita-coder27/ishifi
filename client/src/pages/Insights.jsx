import { motion } from "framer-motion";
import { useState } from "react";
import { Button, Skeleton, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { useFetch } from "../lib/hooks";

export default function Insights() {
  const toast = useToast();
  const { data, loading, reload } = useFetch("/api/ai/full-analysis");
  const [refreshing, setRefreshing] = useState(false);

  const analysis = data?.analysis || {};
  const anomalies = analysis.anomalies || [];
  const predictions = analysis.predictions || {};
  const insights = analysis.insights || [];

  const refresh = async () => {
    setRefreshing(true);
    try {
      await reload();
      toast.success("Analysis refreshed 🧠", " Fresh insights generated");
    } catch (e) {
      toast.error("Failed to refresh", ` ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton h={40} w={300} />
        {[1, 2, 3].map((i) => <Skeleton key={i} h={120} r={22} />)}
      </div>
    );
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>AI Insights 🧠</h2>
          <div className="sub">Machine learning-powered spending analysis</div>
        </div>
        <Button magnetic onClick={refresh} disabled={refreshing}>
          {refreshing ? "Analyzing..." : "🔄 Refresh"}
        </Button>
      </div>

      {/* INSIGHTS SECTION */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
        <b style={{ fontSize: 16, marginBottom: 12 }}>💡 Personalized Insights</b>
        {insights.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--muted)" }}>Need more data for insights (log 20+ transactions)</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}>
                {insight}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* ANOMALIES */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>⚠️ Unusual Spending</b>
          {anomalies.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Your spending looks normal</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {anomalies.map((anom) => (
                <div key={anom.transaction_id} style={{ borderLeft: `3px solid ${getAnomalySeverityColor(anom.severity)}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {money(anom.amount)} on {anom.category}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {anom.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* PREDICTIONS */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, marginBottom: 12 }}>📈 Next Month Forecast</b>
          {Object.keys(predictions).length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Need 3+ months history to predict</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(predictions)
                .sort((a, b) => b[1].predicted - a[1].predicted)
                .slice(0, 5)
                .map(([category, pred]) => (
                  <div key={category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <b style={{ fontSize: 13 }}>{category}</b>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {pred.trend} from {money(pred.current_month)}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{money(pred.predicted)}</div>
                  </div>
                ))}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 13 }}>
                <b>Total predicted:</b> {money(
                  Object.values(predictions).reduce((sum, p) => sum + p.predicted, 0)
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* HOW IT WORKS */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ background: "var(--surface-2)" }}>
        <b style={{ fontSize: 14, marginBottom: 10 }}>🤖 How this works</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
          <b>Insights:</b> AI analyzes 90 days of transactions to find patterns — your biggest categories, when you spend most, savings opportunities.
          <br />
          <b style={{ marginTop: 6, display: "block" }}>Anomalies:</b> Machine learning detects unusual spending (2x typical amount, top 10%) using statistical models.
          <br />
          <b style={{ marginTop: 6, display: "block" }}>Predictions:</b> Linear regression forecasts next month's spending per category based on historical trends.
        </div>
      </motion.div>
    </motion.div>
  );
}

function getAnomalySeverityColor(severity) {
  if (severity > 0.7) return "var(--danger)";
  if (severity > 0.4) return "var(--warn)";
  return "var(--primary)";
}
