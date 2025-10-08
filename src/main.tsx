import { createRoot } from "react-dom/client";
import "./styles.css";
import { scan } from "react-scan";
import App from "./App.tsx";
import { ToastProvider } from "./contexts/toast-context.tsx";
import { initializeSlashCommands } from "./lib/slash-commands";

// helps track re-renders in development mode
scan({
  enabled: true,
});

// Initialize slash commands registry
initializeSlashCommands();

createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    <App />
  </ToastProvider>,
);
