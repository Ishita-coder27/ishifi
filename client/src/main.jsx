import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FxProvider } from "./components/effects";
import { ToastProvider } from "./components/ui";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import "./styles/base.css";

// Note: StrictMode is intentionally off — its double-invoke breaks
// AnimatePresence route exit tracking (framer-motion #1769).
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <FxProvider>
            <App />
          </FxProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

// Tier 6: Register advanced service worker with offline support
if ('serviceWorker' in navigator && 'indexedDB' in window) {
  navigator.serviceWorker.register('/sw-advanced.js', { scope: '/' })
    .then(reg => console.log('[App] Advanced SW registered (Tier 6 offline mode)'))
    .catch(err => {
      console.log('[App] SW registration failed, using basic mode:', err);
      // Fallback to basic SW
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('[App] No offline support:', err);
      });
    });
}
