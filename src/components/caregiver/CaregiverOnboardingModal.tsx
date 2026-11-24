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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-neutral-950/60 select-none animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xl p-6 animate-scale-up">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 rounded-full mb-3">
            <User size={24} className="text-juro-orange" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1.5">
            Selamat Datang di Lembah Juro
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Masukkan namamu agar Juro dapat mengenal dan mengingatmu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="caregiver-name"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Namamu
            </label>
            <input
              id="caregiver-name"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Tulis namamu di sini..."
              autoFocus
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none focus:border-juro-orange focus:ring-2 focus:ring-juro-orange/20"
            />
            {errorMsg && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-1 py-2.5 px-4 rounded-xl bg-juro-orange hover:bg-orange-600 active:scale-[0.98] text-white text-sm font-semibold cursor-pointer transition-all"
          >
            Mulai Merawat Juro
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
