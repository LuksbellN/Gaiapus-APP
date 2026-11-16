import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && env.VITE_APP_API_MODE === "mock") {
    throw new Error(
      "Browser mocks are development-only. Build with VITE_APP_API_MODE=http.",
    );
  }
  // The API the dev server proxies to. GAIAPUS_API_URL lets a second checkout use its own API instance.
  const api = env.GAIAPUS_API_URL || "http://127.0.0.1:3001";
  return {
    server: {
      proxy: {
        "/v1": api,
        "/publications": api,
      },
    },
    build: { target: "es2022" },
  };
});
