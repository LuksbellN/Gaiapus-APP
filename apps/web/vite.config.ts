import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && env.VITE_APP_API_MODE === "mock") {
    throw new Error(
      "Browser mocks are development-only. Build with VITE_APP_API_MODE=http.",
    );
  }
  return {
    server: {
      proxy: {
        "/v1": "http://127.0.0.1:3001",
        "/publications": "http://127.0.0.1:3001",
      },
    },
    build: { target: "es2022" },
  };
});
