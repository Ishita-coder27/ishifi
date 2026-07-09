import { motion } from "framer-motion";
import Icon from "../components/Icon";
import { Button, Skeleton, stagger, useToast } from "../components/ui";
import { Sparkline, AreaChart, Bars } from "../components/charts";
import { money } from "../lib/format";
import { useFetch } from "../lib/hooks";

export default function AdminDashboard() {
  const toast = useToast();
  const { data, loading } = useFetch("/api/admin/dashboard");

  if (loading) {
    return <div className="grid" style={{ gap: 16 }}>
      <Skeleton h={40} w={300} />
      <div className="grid cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={110} r={22} />)}</div>
    </div>;
  }

  const stats = [
    { label: "Total Users", value: data?.total_users || 0, icon: "profile", color: "#FF6B9D" },
    { label: "Active Users", value: data?.active_users || 0, icon: "check", color: "#5BC8AF" },
    { label: "Total Transactions", value: data?.total_transactions || 0, icon: "transactions", color: "#7FB5FF" },
    { label: "Total Revenue", value: money(data?.total_revenue || 0), icon: "briefcase", color: "#FFD700" },
  ];

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Admin Dashboard</h2>
          <div className="sub">Enterprise metrics and user management</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid cols-4" style={{ marginBottom: 24 }}>
        {stats.map((stat, i) => (
          <motion.div key={i} className="card card-pad" variants={stagger.item}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                {stat.label}
              </span>
              <Icon name={stat.icon} size={18} style={{ color: stat.color }} />
            </div>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        {/* User Growth */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, display: "block", marginBottom: 12 }}>User Growth (30 days)</b>
          {data?.user_growth && (
            <Sparkline
              data={data.user_growth.map((d) => d.count)}
              w={400}
              h={100}
              color="#FF6B9D"
            />
          )}
        </motion.div>

        {/* Savings Rate */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Average Savings Rate</b>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--good)", marginBottom: 8 }}>
            {data?.avg_savings_rate || 0}%
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>
            Across all users
          </div>
        </motion.div>
      </div>

      {/* Top Categories */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 24 }}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Top Spending Categories</b>
        {data?.top_categories && data.top_categories.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.top_categories.map((cat, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                  {cat.category}
                </div>
                <div style={{ fontSize: 13, color: "var(--primary-2)", fontWeight: 700 }}>
                  {cat.count} transactions
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>No data yet</div>
        )}
      </motion.div>

      {/* Admin Actions */}
      <motion.div className="card card-pad" variants={stagger.item}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Admin Actions</b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="soft">View All Users</Button>
          <Button variant="soft">Audit Logs</Button>
          <Button variant="soft">System Settings</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
