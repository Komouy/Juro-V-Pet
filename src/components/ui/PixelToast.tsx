import React, { useEffect } from "react";
import { Check, AlertCircle, Info } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

export const PixelToast: React.FC = () => {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const toneStyles =
    toast.tone === "warn"
      ? "bg-rose-600 text-white border-charcoal dark:border-neutral-600"
      : toast.tone === "info"
      ? "bg-charcoal text-white border-charcoal dark:bg-dark-surface dark:border-neutral-600"
      : "bg-emerald-600 text-white border-charcoal dark:border-neutral-600";

  const Icon =
    toast.tone === "warn" ? AlertCircle : toast.tone === "info" ? Info : Check;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-18 md:bottom-5 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div
        key={toast.id}
        className={`animate-toast-enter max-w-full sm:max-w-md px-3 py-1.5 border-2 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] inline-flex items-center gap-1.5 pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider ${toneStyles}`}
      >
        <Icon size={12} strokeWidth={3} className="shrink-0" />
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  );
};
