import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { App } from "./app/App";
import { soundEffects } from "./engine/audio/soundEffects";

// Tangkap kegagalan modul dinamis Vite (akibat deployment baru Vercel) dan muat ulang otomatis
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const lastReload = Number(sessionStorage.getItem("juro_last_preload_reload") || 0);
    const now = Date.now();
    if (now - lastReload > 8000) {
      sessionStorage.setItem("juro_last_preload_reload", String(now));
      console.warn("Vite preload error terdeteksi. Memperbarui ke versi terbaru...");
      window.location.reload();
    }
  });

  // Buka kunci AudioContext secara elegan pada sentuhan / gestur pengguna pertama
  const onFirstInteraction = () => {
    soundEffects.unlockAudio();
    window.removeEventListener("pointerdown", onFirstInteraction);
    window.removeEventListener("keydown", onFirstInteraction);
  };
  window.addEventListener("pointerdown", onFirstInteraction, { passive: true });
  window.addEventListener("keydown", onFirstInteraction, { passive: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
