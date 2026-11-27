import React, { useState } from "react";
import { createPortal } from "react-dom";
import { User } from "lucide-react";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { addPetMemory } from "../../services/petMemoryService";
import { soundEffects } from "../../engine/audio/soundEffects";
import { PixelInput } from "../ui/PixelInput";
import { Button } from "../ui/Button";

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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-charcoal/65 select-none animate-fade-in">
      <div className="relative w-full max-w-sm rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[6px_6px_0_#18181B] dark:shadow-[6px_6px_0_#09090B] p-6 animate-scale-up">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] rounded-[4px] mb-3">
            <User size={22} className="text-juro-orange" />
          </div>
          <h2 className="font-pixel text-sm sm:text-base font-bold uppercase text-charcoal dark:text-white mb-1.5">
            Selamat Datang di Lembah Juro
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Masukkan namamu agar Juro dapat mengenal dan mengingatmu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <PixelInput
            id="caregiver-name"
            label="Namamu"
            type="text"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onClear={() => setNameInput("")}
            placeholder="Tulis namamu di sini..."
            autoFocus
            maxLength={20}
            error={errorMsg ?? undefined}
          />

          <Button
            type="submit"
            label="Mulai Merawat Juro"
            variant="accent"
            size="md"
            className="w-full"
          />
        </form>
      </div>
    </div>,
    document.body
  );
};
