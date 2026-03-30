import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./providers/ThemeProvider.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="webuild-theme">
    <App />
  </ThemeProvider>
);
