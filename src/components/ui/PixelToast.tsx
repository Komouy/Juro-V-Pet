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
      ? "bg-rose-600 text-white border-charcoal"
      : toast.tone === "info"
      ? "bg-charcoal text-[#FDFBF7] border-charcoal dark:bg-[#1E2028] dark:border-[#4A4E5E]"
      : "bg-emerald-600 text-white border-charcoal";

  const ledColor =
    toast.tone === "warn"
      ? "bg-amber-300"
      : toast.tone === "info"
      ? "bg-juro-orange"
      : "bg-emerald-200";

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
        className={`animate-toast-enter max-w-full sm:max-w-md px-3.5 py-2 rounded-[4px] border-2 shadow-[0_4px_0_#18181B] inline-flex items-center gap-2 text-xs font-pixel font-bold tracking-wide ${toneStyles}`}
      >
        <span className={`w-2 h-2 rounded-[1px] border border-charcoal shrink-0 ${ledColor}`} aria-hidden="true" />
        <Icon size={14} strokeWidth={2.4} className="shrink-0" />
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  );
};
