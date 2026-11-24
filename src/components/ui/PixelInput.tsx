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
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              {label}
            </label>
          )}
          {maxLength && (
            <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Input Outer Frame */}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-neutral-400 dark:text-neutral-400 z-10">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}

        <input
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full rounded-xl bg-white dark:bg-dark-surface
            border transition-all duration-150 text-sm
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            py-2.5 px-3.5
            ${Icon ? "pl-10" : "pl-3.5"}
            ${onClear || isSuccess || error ? "pr-10" : "pr-3.5"}
            ${
              error
                ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                : isSuccess
                ? "border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                : "border-neutral-300 dark:border-neutral-700 focus:border-juro-orange focus:ring-2 focus:ring-juro-orange/20"
            }
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          onChange={handleChange}
          {...props}
        />

        {/* Action / Status Icons on Right */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {onClear && currentLength > 0 && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Bersihkan input"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}

          {isSuccess && !error && (
            <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-500" />
          )}

          {error && (
            <AlertCircle size={16} strokeWidth={2} className="text-rose-500" />
          )}
        </div>
      </div>

      {/* Helper / Error Text */}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <AlertCircle size={13} strokeWidth={2} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
