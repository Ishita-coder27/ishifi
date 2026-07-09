import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "soft-light", name: "Soft Light", emoji: "🌸", swatch: ["#FFFDFB", "#FF6FAE", "#FFD6C2"] },
  { id: "premium-dark", name: "Premium Dark", emoji: "🌙", swatch: ["#17131F", "#FF7EB6", "#C9B8FF"] },
  { id: "sakura", name: "Sakura Pink", emoji: "🌷", swatch: ["#FFF3F7", "#F4649B", "#FFB3C7"] },
  { id: "beige", name: "Beige Minimal", emoji: "🤎", swatch: ["#FAF6EF", "#B08961", "#E4D3B8"] },
  { id: "lavender", name: "Lavender Dream", emoji: "💜", swatch: ["#F7F4FF", "#8D7BE8", "#DCCEFF"] },
  { id: "sunset", name: "Sunset Peach", emoji: "🍑", swatch: ["#FFF5ED", "#FF8A5C", "#FFB3C7"] },
];

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => document.documentElement.dataset.theme || "soft-light"
  );

  const setTheme = useCallback((id, origin) => {
    const apply = () => {
      document.documentElement.dataset.theme = id;
      setThemeState(id);
    };
    try { localStorage.setItem("ishifi-theme", id); } catch { /* private mode */ }

    // Circular reveal via the View Transitions API, falling back to a soft fade.
    if (document.startViewTransition && origin) {
      const { x, y } = origin;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 620, easing: "cubic-bezier(0.22,1,0.36,1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
    } else {
      document.documentElement.classList.add("theme-fade");
      apply();
      setTimeout(() => document.documentElement.classList.remove("theme-fade"), 620);
    }
  }, []);

  // keep in sync if another tab switches
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "ishifi-theme" && e.newValue) {
        document.documentElement.dataset.theme = e.newValue;
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme, THEMES }}>{children}</ThemeCtx.Provider>;
}
