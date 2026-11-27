import React, { useId, useState } from "react";
import { type LucideIcon, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { NotchedSlot } from "./CartridgeFrame";

export interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  isSuccess?: boolean;
  compact?: boolean;
  hideCounter?: boolean;
  onClear?: () => void;
}

export const PixelInput: React.FC<PixelInputProps> = ({
  id,
  label,
  icon: Icon,
  error,
  hint,
  isSuccess,
  compact = false,
  hideCounter = false,
  onClear,
  value,
  maxLength,
  className = "",
  disabled,
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const currentLength = typeof value === "string" ? value.length : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundEffects.playKeyTap();
    onChange?.(e);
  };

  const slotState = error ? "error" : isSuccess ? "success" : "default";

  return (
    <div className="space-y-1.5 w-full select-none">
      {/* Label & Cartridge Character Counter */}
      {(label || (maxLength && !hideCounter)) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={inputId}
              className="font-pixel text-[11px] font-bold uppercase tracking-wide text-charcoal dark:text-neutral-200 cursor-pointer"
            >
              {label}
            </label>
          )}
          {maxLength && !hideCounter && (
            <span className="font-mono-hud text-[11px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#EFE9DC] dark:bg-[#101114] border border-charcoal/25 dark:border-[#3F424E] text-charcoal/75 dark:text-neutral-400">
              {String(currentLength).padStart(2, "0")}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Notched / Chamfered Cartridge Input Slot */}
      <NotchedSlot
        state={slotState}
        disabled={disabled}
        innerClassName={`${compact ? "px-2.5 py-1.5 min-h-[36px]" : "px-3 py-2 min-h-[42px]"} gap-2 relative`}
      >
        {/* Prompt Glyph / Optional Icon (single native caret inside input tracks typing position) */}
        <div className="flex items-center shrink-0 pointer-events-none">
          {Icon ? (
            <Icon
              size={compact ? 14 : 15}
              strokeWidth={2.2}
              className={`transition-colors ${
                isFocused && !disabled ? "text-juro-orange" : "text-juro-orange/70"
              }`}
            />
          ) : (
            <span
              className={`font-pixel text-xs font-bold leading-none transition-colors ${
                isFocused && !disabled ? "text-juro-orange" : "text-juro-orange/70"
              }`}
            >
              &gt;
            </span>
          )}
        </div>

        <input
          id={inputId}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={`
            flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-mono-hud select-text
            text-charcoal dark:text-[#F4F4F5] caret-juro-orange
            placeholder:text-neutral-500/85 dark:placeholder:text-neutral-500
            focus:outline-none disabled:cursor-not-allowed
            ${className}
          `}
          onChange={handleChange}
          {...props}
        />

        {/* Right Action / Semantic Status */}
        {(onClear && currentLength > 0 && !disabled) || isSuccess || error ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {onClear && currentLength > 0 && !disabled && (
              <button
                type="button"
                onClick={onClear}
                className="p-0.5 rounded-[2px] text-neutral-500 hover:text-charcoal hover:bg-charcoal/10 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Bersihkan input"
                aria-label="Bersihkan input"
              >
                <X size={13} strokeWidth={2.2} />
              </button>
            )}
            {isSuccess && !error && (
              <CheckCircle2 size={15} strokeWidth={2.2} className="text-emerald-600 dark:text-emerald-400" />
            )}
            {error && (
              <AlertCircle size={15} strokeWidth={2.2} className="text-rose-600 dark:text-rose-400" />
            )}
          </div>
        ) : null}
      </NotchedSlot>

      {/* Helper / Error Text */}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <AlertCircle size={13} strokeWidth={2.2} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
};
