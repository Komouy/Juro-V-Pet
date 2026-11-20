import React, { useState } from "react";
import { createPortal } from "react-dom";
import { User } from "lucide-react";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { addPetMemory } from "../../services/petMemoryService";
import { soundEffects } from "../../engine/audio/soundEffects";

interface CaregiverOnboardingModalProps {
  onSuccess?: (name: string) => void;
}

export const CaregiverOnboardingModal: React.FC<CaregiverOnboardingModalProps> = ({ onSuccess }) => {
  const [nameInput, setNameInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const setProfile = useCaregiverStore((s) => s.setProfile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();

    if (cleanName.length < 2) {
      setErrorMsg("Nama minimal 2 karakter.");
      soundEffects.playDizzy();
      return;
    }

    if (cleanName.length > 20) {
      setErrorMsg("Nama maksimal 20 karakter.");
      soundEffects.playDizzy();
      return;
    }

    setErrorMsg(null);
    setProfile(cleanName);

    // Rekam ke memori batin Juro bahwa perawatnya bernama {cleanName}
    addPetMemory(`Perawat Juro bernama ${cleanName}.`, "profile");

    soundEffects.playSuccess();
    onSuccess?.(cleanName);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-xs select-none animate-fade-in">
      <div className="relative w-full max-w-sm bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] p-5 animate-scale-up">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b-2 border-charcoal dark:border-neutral-700 pb-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="pixel-text text-[10px] uppercase font-bold text-charcoal dark:text-white tracking-wider">
              Perkenalan Dulu Dong!
            </span>
          </div>
        </div>

        {/* Mascot Greeting */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 rounded-full mb-2 shadow-[2px_2px_0px_#171717]">
            <User size={24} className="text-juro-orange" />
          </div>
          <h2 className="pixel-text text-[13px] uppercase font-bold text-charcoal dark:text-white mb-1.5 leading-snug">
            Selamat Datang di Lembah Juro!
          </h2>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
            Sebelum mulai merawat dan bermain bersama Juro, beri tahu namamu agar Juro mengenal dan mengingatmu!
          </p>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="caregiver-name"
              className="block pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-neutral-300 mb-1"
            >
              Namamu:
            </label>
            <input
              id="caregiver-name"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Tulis namamu disini..."
              autoFocus
              maxLength={20}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 text-charcoal dark:text-white text-sm font-sans placeholder:text-neutral-400 focus:outline-hidden focus:border-juro-orange focus:ring-1 focus:ring-juro-orange shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
            />
            {errorMsg && (
              <p className="pixel-text text-[9px] text-red-500 mt-1">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-1.5 py-2.5 px-4 bg-juro-orange hover:bg-orange-600 active:translate-x-[1px] active:translate-y-[1px] text-white border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] pixel-text text-[10px] uppercase font-bold cursor-pointer transition-colors"
          >
            Mulai Merawat Juro
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
