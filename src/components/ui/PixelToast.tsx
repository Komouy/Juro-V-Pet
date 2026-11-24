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
      ? "bg-rose-600 text-white border-rose-700"
      : toast.tone === "info"
      ? "bg-neutral-900 text-white border-neutral-800 dark:bg-neutral-800 dark:border-neutral-700"
      : "bg-emerald-600 text-white border-emerald-700";

  const Icon =
    toast.tone === "warn" ? AlertCircle : toast.tone === "info" ? Info : Check;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-18 md:bottom-5 z-[110] flex justify-center px-4 pointer-events-none"
    >
      <div
        key={toast.id}
        className={`animate-toast-enter max-w-full sm:max-w-md px-4 py-2 rounded-full border shadow-lg inline-flex items-center gap-2 text-xs sm:text-sm font-medium ${toneStyles}`}
      >
        <Icon size={15} strokeWidth={2.2} className="shrink-0" />
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  );
};
