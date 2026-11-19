import React from "react";
import { type LucideIcon, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";

export interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  isSuccess?: boolean;
  onClear?: () => void;
}

export const PixelInput: React.FC<PixelInputProps> = ({
  label,
  icon: Icon,
  error,
  hint,
  isSuccess,
  onClear,
  value,
  maxLength,
  className = "",
  disabled,
  onChange,
  ...props
}) => {
  const currentLength = typeof value === "string" ? value.length : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundEffects.playKeyTap();
    onChange?.(e);
  };

  return (
    <div className="space-y-1.5 w-full select-none">
      {/* Label & Character Counter Bar */}
      {(label || maxLength) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="pixel-text text-[10px] uppercase text-charcoal dark:text-neutral-200 tracking-wider font-bold">
              {label}
            </label>
          )}
          {maxLength && (
            <span className="pixel-text text-[9px] text-muted dark:text-neutral-400">
              [{currentLength}/{maxLength}]
            </span>
          )}
        </div>
      )}

      {/* Input Outer Frame */}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 pointer-events-none text-charcoal/70 dark:text-neutral-400 z-10">
            <Icon size={14} strokeWidth={2.5} />
          </div>
        )}

        <input
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full bg-white dark:bg-dark-surface
            border-2 transition-all duration-75 pixel-text text-[11px]
            text-charcoal dark:text-white
            placeholder:text-muted/60 dark:placeholder:text-neutral-500
            py-2.5 px-3
            ${Icon ? "pl-9" : "pl-3"}
            ${onClear || isSuccess || error ? "pr-9" : "pr-3"}
            ${
              error
                ? "border-rose-600 shadow-[2px_2px_0px_#E11D48] dark:shadow-[2px_2px_0px_#E11D48]"
                : isSuccess
                ? "border-emerald-600 shadow-[2px_2px_0px_#059669] dark:shadow-[2px_2px_0px_#059669]"
                : "border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]"
            }
            focus:outline-none focus:border-juro-orange focus:shadow-[3px_3px_0px_#F97316]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          onChange={handleChange}
          {...props}
        />

        {/* Action / Status Icons on Right */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {onClear && currentLength > 0 && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 text-muted hover:text-charcoal dark:hover:text-white transition-colors cursor-pointer"
              title="Bersihkan input"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}

          {isSuccess && !error && (
            <CheckCircle2 size={14} strokeWidth={2.5} className="text-emerald-500" />
          )}

          {error && (
            <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600" />
          )}
        </div>
      </div>

      {/* Helper / Error Text */}
      {error ? (
        <p className="pixel-text text-[9px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle size={11} strokeWidth={2.5} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="pixel-text text-[9px] text-muted dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
