import React, { useState, useRef, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PixelInput } from "../components/ui/PixelInput";
import { PixelSwitch } from "../components/ui/PixelSwitch";
import { usePetStore } from "../stores/petStore";
import { useUIStore } from "../stores/uiStore";
import { soundEffects } from "../engine/audio/soundEffects";
import { persistenceService } from "../services/persistenceService";
import {
  User,
  Sliders,
  RotateCcw,
  Check,
  Download,
  Upload,
  Database,
  Settings,
  Bot,
  Key,
} from "lucide-react";
import {
  setGeminiApiKey,
  getGeminiKeySource,
  getCustomGeminiApiKey,
} from "../services/geminiService";

export const SettingsPage: React.FC = () => {
  const { name } = usePetStore();
  const { theme, soundEnabled, toggleTheme, toggleSound, showToast } = useUIStore();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getCustomGeminiApiKey());
  const [geminiSavedSuccess, setGeminiSavedSuccess] = useState(false);
  const [keySource, setKeySource] = useState(() => getGeminiKeySource());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geminiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (geminiTimerRef.current) clearTimeout(geminiTimerRef.current);
    };
  }, []);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(geminiKeyInput);
    setKeySource(getGeminiKeySource());
    setGeminiSavedSuccess(true);
    soundEffects.playSuccess();
    showToast(
      geminiKeyInput.trim() ? "Kunci pribadi tersimpan" : "Kunci pribadi dihapus (pakai bawaan jika ada)",
      "success"
    );
    if (geminiTimerRef.current) clearTimeout(geminiTimerRef.current);
    geminiTimerRef.current = setTimeout(() => {
      setGeminiSavedSuccess(false);
      geminiTimerRef.current = null;
    }, 2200);
  };

  const petNameInput = draftName ?? name;
  const trimmedName = petNameInput.trim();
  const canSaveName = trimmedName.length > 0 && trimmedName !== name;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveName) return;
    usePetStore.setState({ name: trimmedName });
    setDraftName(null);
    persistenceService.saveNow();
    setSavedSuccess(true);
    soundEffects.playSuccess();
    showToast("Nama tersimpan", "success");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSavedSuccess(false);
      savedTimerRef.current = null;
    }, 2200);
  };

  const handleExportBackup = async () => {
    const jsonString = await persistenceService.exportSaveFile();
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `juro-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundEffects.playSuccess();
    showToast("Cadangan diunduh", "success");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await persistenceService.importSaveFile(content);
        if (success) {
          setDraftName(null);
          soundEffects.playSuccess();
          showToast("Data dipulihkan", "success");
        } else {
          soundEffects.playError();
          showToast("File cadangan tidak valid", "warn");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmReset = async () => {
    await persistenceService.resetAll();
    setDraftName(null);
    setConfirmingReset(false);
    soundEffects.playWarning();
    showToast("Seluruh data diatur ulang", "info");
  };

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-4 md:py-5 space-y-5">
      <div className="border-b-2 border-charcoal/15 dark:border-neutral-700 pb-3.5 flex items-center justify-between gap-2">
        <h1 className="pixel-text text-sm md:text-base text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2 shrink-0">
          <Settings size={16} strokeWidth={2.5} className="text-juro-orange" />
          <span>Pengaturan</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Pet Name */}
        <Card shadowOffset="sm" className="p-4">
          <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase mb-3 flex items-center gap-2">
            <User size={13} strokeWidth={2.5} className="text-juro-orange" />
            <span>Nama Juro</span>
          </h2>
          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1">
              <PixelInput
                value={petNameInput}
                onChange={(e) => setDraftName(e.target.value)}
                onClear={() => setDraftName("")}
                placeholder="Nama pet..."
                maxLength={18}
                isSuccess={savedSuccess}
              />
            </div>
            <Button
              label={savedSuccess ? "Tersimpan" : "Simpan"}
              icon={savedSuccess ? Check : undefined}
              size="sm"
              variant="primary"
              type="submit"
              disabled={!canSaveName && !savedSuccess}
            />
          </form>
        </Card>

        {/* Preferences */}
        <Card shadowOffset="sm" className="p-4">
          <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase mb-3.5 flex items-center gap-2">
            <Sliders size={13} strokeWidth={2.5} className="text-juro-orange" />
            <span>Tampilan & Suara</span>
          </h2>

          <div className="space-y-4">
            <PixelSwitch
              label="Mode Gelap"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <div className="border-t border-charcoal/10 dark:border-neutral-700" />
            <PixelSwitch
              label="Efek Suara"
              checked={soundEnabled}
              onChange={toggleSound}
            />
          </div>
        </Card>

        {/* Gemini AI Settings */}
        <Card shadowOffset="sm" className="p-4 md:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase flex items-center gap-2">
              <Bot size={13} strokeWidth={2.5} className="text-juro-orange" />
              <span>Gemini AI Pet Chat</span>
            </h2>
            <span
              className={`pixel-text text-[8px] sm:text-[9px] uppercase font-bold ${
                keySource === "custom"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : keySource === "env"
                  ? "text-juro-orange"
                  : "text-neutral-500"
              }`}
            >
              {keySource === "custom"
                ? "Kunci Pribadi Aktif"
                : keySource === "env"
                ? "Kunci Bawaan Web Aktif (Semua Pengunjung Bisa Chat)"
                : "Mode Standar / Offline"}
            </span>
          </div>

          <p className="pixel-text text-[8px] sm:text-[9px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Agar <strong>semua pengunjung web</strong> selalu bisa langsung ngobrol dengan Juro tanpa perlu memasukkan kunci, isi <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-charcoal dark:text-neutral-200 font-mono">VITE_GEMINI_API_KEY</code> di file <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-charcoal dark:text-neutral-200 font-mono">.env.local</code> atau di Pengaturan Environment Variables hosting (Vercel). Kunci dapat berawalan <code className="font-mono">AQ...</code> atau <code className="font-mono">AIzaSy...</code>.
          </p>

          <form onSubmit={handleSaveGeminiKey} className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1">
              <PixelInput
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                onClear={() => setGeminiKeyInput("")}
                placeholder={keySource === "env" ? "Kunci bawaan web aktif (selalu dipakai)" : "AQ... atau AIzaSy..."}
                isSuccess={geminiSavedSuccess}
              />
            </div>
            <Button
              label={geminiSavedSuccess ? "Tersimpan" : "Simpan Kunci"}
              icon={geminiSavedSuccess ? Check : Key}
              size="sm"
              variant="primary"
              type="submit"
            />
          </form>
        </Card>

        {/* Backup & Reset */}
        <Card shadowOffset="sm" className="p-4 md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase flex items-center gap-2">
              <Database size={13} strokeWidth={2.5} className="text-juro-orange" />
              <span>Cadangan Data</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                label="Ekspor JSON"
                icon={Download}
                size="sm"
                variant="secondary"
                onClick={handleExportBackup}
              />
              <Button
                label="Impor JSON"
                icon={Upload}
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          <div className="pt-3.5 border-t border-charcoal/15 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3">
            <span className="pixel-text text-[10px] text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1.5">
              <RotateCcw size={12} strokeWidth={2.5} />
              <span>Reset Progres</span>
            </span>

            {confirmingReset ? (
              <div className="flex items-center gap-2">
                <Button
                  label="Yakin Reset"
                  size="sm"
                  variant="danger"
                  onClick={handleConfirmReset}
                />
                <Button
                  label="Batal"
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmingReset(false)}
                />
              </div>
            ) : (
              <Button
                label="Reset Data"
                size="sm"
                variant="danger"
                onClick={() => setConfirmingReset(true)}
              />
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};
