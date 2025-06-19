import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // NUEVA SECCIÓN: Configuración del servidor de desarrollo de Vite
  server: {
    // Cuando el frontend (React) en desarrollo haga una petición a una ruta que empieza con '/api',
    // Vite la reenviará a 'http://localhost:5000'
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
