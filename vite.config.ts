import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createApiPlugin } from "./src/server/routes";

export default defineConfig(({ mode }) => {
  // Load every env var (not just VITE_-prefixed) so Merge keys are available
  // to the server middleware but never leak into the client bundle.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), createApiPlugin(env)],
  };
});
