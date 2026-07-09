let CURRENCY = "₹";
export const setCurrency = (c) => { CURRENCY = c || "₹"; };
export const getCurrency = () => CURRENCY;

/* Indian-style grouping: 1234567 → ₹12,34,567 (other currencies group by 3) */
export function money(n, { sign = false, decimals = 0 } = {}) {
  if (n == null || isNaN(n)) return "—";
  const neg = n < 0;
  const abs = Math.abs(n);
  let s;
  if (CURRENCY === "₹") {
    const fixed = decimals ? abs.toFixed(decimals) : String(Math.round(abs));
    const [int, frac] = fixed.split(".");
    let out = int;
    if (int.length > 3) {
      let head = int.slice(0, -3);
      const tail = int.slice(-3);
      const parts = [];
      while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
      if (head) parts.unshift(head);
      out = parts.join(",") + "," + tail;
    }
    s = out + (frac ? "." + frac : "");
  } else {
    s = abs.toLocaleString("en-US", { maximumFractionDigits: decimals });
  }
  const prefix = neg ? "−" : sign ? "+" : "";
  return `${prefix}${CURRENCY}${s}`;
}

export function moneyShort(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (CURRENCY === "₹") {
    if (abs >= 1e7) return CURRENCY + (n / 1e7).toFixed(1).replace(/\.0$/, "") + "Cr";
    if (abs >= 1e5) return CURRENCY + (n / 1e5).toFixed(1).replace(/\.0$/, "") + "L";
  }
  if (abs >= 1e6) return CURRENCY + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1e3) return CURRENCY + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return CURRENCY + Math.round(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function niceDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== today.getFullYear() ? " " + d.getFullYear() : ""}`;
}

export function niceDateTime(iso) {
  const d = new Date(iso);
  return `${niceDate(iso)}, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function monthLabel(ym) {
  return `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
}

export function daysUntil(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000);
  return diff;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
