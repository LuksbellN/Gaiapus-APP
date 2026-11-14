import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import App from "./App";
import "./styles/app.css";

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_APP_API_MODE !== "http") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
      quiet: true,
    });
  }
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
start().catch(() => {
  document.getElementById("root")!.innerHTML =
    '<main style="font:18px system-ui;padding:40px;color:#e8f2ff;background:#050c20;min-height:100vh"><h1>Não foi possível iniciar a prévia.</h1><p>Confira a configuração da API ou do serviço de mocks e recarregue a página.</p></main>';
});
