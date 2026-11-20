import React, { useState, useRef, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PixelInput } from "../components/ui/PixelInput";
import { PixelSwitch } from "../components/ui/PixelSwitch";
import { usePetStore } from "../stores/petStore";
import { useUIStore } from "../stores/uiStore";
import { soundEffects } from "../engine/audio/soundEffects";
import { persistenceService } from "../services/persistenceService";
import { notificationService } from "../services/notificationService";
import {
  User,
  Sliders,
  RotateCcw,
  Check,
  Download,
  Upload,
  Database,
  Settings,
  Bell,
  Smartphone,
  Share2,
  Copy,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { name } = usePetStore();
  const { theme, soundEnabled, toggleTheme, toggleSound, showToast } = useUIStore();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => notificationService.isEnabled());
  const [testingNotif, setTestingNotif] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleToggleNotifications = async () => {
    if (!notifEnabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setNotifEnabled(true);
        notificationService.setEnabled(true);
        soundEffects.playSuccess();
        showToast("Notifikasi diaktifkan", "success");
      } else {
        soundEffects.playWarning();
        showToast("Izin notifikasi belum diberikan di perangkat", "warn");
      }
    } else {
      setNotifEnabled(false);
      notificationService.setEnabled(false);
      soundEffects.playDismiss();
      showToast("Notifikasi dinonaktifkan", "info");
    }
  };

  const handleTestNotification = async () => {
    setTestingNotif(true);
    const success = await notificationService.sendTestNotification();
    setTestingNotif(false);
    if (success) {
      setNotifEnabled(true);
      soundEffects.playSuccess();
      showToast("Notifikasi tes terkirim!", "success");
    } else {
      soundEffects.playWarning();
      showToast("Izin notifikasi belum diizinkan", "warn");
    }
  };

  const APK_DOWNLOAD_URL =
    "https://github.com/Komouy/Juro-V-Pet/releases/download/latest/Juro-Virtual-Pet.apk";
  const RELEASES_PAGE_URL = "https://github.com/Komouy/Juro-V-Pet/releases";

  const handleDownloadApk = () => {
    soundEffects.playClick();
    window.open(APK_DOWNLOAD_URL, "_blank");
  };

  const handleCopyApkLink = () => {
    soundEffects.playPop();
    navigator.clipboard.writeText(APK_DOWNLOAD_URL);
    showToast("Link unduh APK disalin!", "success");
  };

  const handleShareApk = async () => {
    soundEffects.playClick();
    const shareData = {
      title: "Juro Virtual Pet",
      text: "Yuk rawat Juro bersama di HP Android kamu! Unduh APK resminya di sini:",
      url: APK_DOWNLOAD_URL,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled share
      }
    }

    const waText = encodeURIComponent(`${shareData.text} ${APK_DOWNLOAD_URL}`);
    window.open(`https://api.whatsapp.com/send?text=${waText}`, "_blank");
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

        {/* Notifications & Reminders */}
        <Card shadowOffset="sm" className="p-4 md:col-span-2 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase flex items-center gap-2">
              <Bell size={13} strokeWidth={2.5} className="text-juro-orange" />
              <span>Notifikasi & Pengingat Asuh</span>
            </h2>
            <Button
              label={testingNotif ? "Mengirim..." : "Tes Notifikasi"}
              size="sm"
              variant="secondary"
              disabled={testingNotif}
              onClick={handleTestNotification}
            />
          </div>

          <div className="pt-2 border-t border-charcoal/10 dark:border-neutral-700 space-y-2">
            <PixelSwitch
              label="Aktifkan Notifikasi Pengingat"
              checked={notifEnabled}
              onChange={handleToggleNotifications}
            />
            <p className="pixel-text text-[8.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Kirimkan pemberitahuan saat Juro membutuhkan perhatian (lapar, mengantuk, atau kotor) serta saat pasangan perawat merawat Juro ketika aplikasi sedang diminimalkan.
            </p>
          </div>
        </Card>

        {/* Android App (.apk) */}
        <Card shadowOffset="sm" className="p-4 md:col-span-2 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="pixel-text text-[11px] text-charcoal dark:text-white uppercase flex items-center gap-2">
              <Smartphone size={13} strokeWidth={2.5} className="text-juro-orange" />
              <span>Aplikasi Android (.apk)</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                label="Unduh APK"
                icon={Download}
                size="sm"
                variant="primary"
                onClick={handleDownloadApk}
              />
              <Button
                label="Salin Link"
                icon={Copy}
                size="sm"
                variant="secondary"
                onClick={handleCopyApkLink}
              />
              <Button
                label="Bagikan"
                icon={Share2}
                size="sm"
                variant="secondary"
                onClick={handleShareApk}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-charcoal/10 dark:border-neutral-700 space-y-2">
            <p className="pixel-text text-[8.5px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Pasang Juro sebagai aplikasi di HP Android Anda dan pasangan. Dapatkan notifikasi langsung saat Juro lapar atau saat pasangan merawat Juro tanpa perlu membuka browser.
            </p>
            <div className="flex items-center gap-2 text-[8px] pixel-text text-neutral-400">
              <span>File: Juro-Virtual-Pet.apk</span>
              <span>•</span>
              <a
                href={RELEASES_PAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-juro-orange"
              >
                Riwayat Rilis GitHub
              </a>
            </div>
          </div>
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
