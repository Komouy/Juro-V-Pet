import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { App } from "./app/App";

// Tangkap kegagalan modul dinamis Vite (akibat deployment baru Vercel) dan muat ulang otomatis
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    console.warn("Vite preload error terdeteksi. Memperbarui ke versi terbaru...");
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
