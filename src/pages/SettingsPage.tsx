import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PixelInput } from "../components/ui/PixelInput";
import { PixelSwitch } from "../components/ui/PixelSwitch";
import { CaregiverHubPanel } from "../components/caregiver/CaregiverHubModal";
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
  MessageSquare,
  LayoutGrid,
  Play,
  X,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { name } = usePetStore();
  const {
    theme,
    soundEnabled,
    scanlinesEnabled,
    actionMenuStyle,
    toggleTheme,
    toggleSound,
    toggleScanlines,
    setActionMenuStyle,
    showToast,
  } = useUIStore();
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
    navigate("/");
  };

  const handleReplayIntro = () => {
    soundEffects.playClick();
    useUIStore.getState().resetIntro();
    navigate("/");
  };

  return (
    <section className="w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      <div className="border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-3.5 flex items-center justify-between gap-3">
        <h1 className="font-pixel text-base sm:text-lg font-bold uppercase text-charcoal dark:text-white tracking-wide flex items-center gap-2 shrink-0">
          <Settings size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Pengaturan</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            soundEffects.playDismiss();
            navigate("/");
          }}
          className="console-btn-bevel w-8 h-8 rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] bg-[#FDFBF7] dark:bg-[#101114] shadow-[0_2px_0_#18181B] inline-flex items-center justify-center text-charcoal hover:text-juro-orange dark:text-neutral-200 transition-colors cursor-pointer"
          aria-label="Tutup dan kembali ke Home"
          title="Kembali ke Home"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        {/* Column 1: Nama Juro + Profil & Perawat */}
        <div className="space-y-3.5">
          {/* Pet Name */}
          <Card shadowOffset="sm" className="p-4">
            <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white mb-3 flex items-center gap-2">
              <User size={15} strokeWidth={2.2} className="text-juro-orange" />
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
                size="md"
                variant="primary"
                type="submit"
                disabled={!canSaveName && !savedSuccess}
              />
            </form>
          </Card>

          {/* Profil & Perawat (2P Pairing & Buku Harian) */}
          <Card shadowOffset="sm" className="p-4">
            <CaregiverHubPanel />
          </Card>
        </div>

        {/* Column 2: Tampilan & Suara + Gaya Menu Interaksi + Notifikasi */}
        <div className="space-y-3.5">
          {/* Preferences */}
          <Card shadowOffset="sm" className="p-4">
            <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white mb-3.5 flex items-center gap-2">
              <Sliders size={15} strokeWidth={2.2} className="text-juro-orange" />
              <span>Tampilan &amp; Suara</span>
            </h2>

            <div className="space-y-4">
              <PixelSwitch
                label="Mode Gelap"
                checked={theme === "dark"}
                onChange={toggleTheme}
              />
              <div className="border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E]" />
              <PixelSwitch
                label="Efek Suara"
                checked={soundEnabled}
                onChange={toggleSound}
              />
              <div className="border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E]" />
              <PixelSwitch
                label="Garis Layar CRT"
                description="Tekstur garis tipis ala konsol retro pada panel."
                checked={scanlinesEnabled}
                onChange={toggleScanlines}
              />
            </div>
          </Card>

          {/* Interaction Style */}
          <Card shadowOffset="sm" className="p-4 space-y-3">
            <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white flex items-center gap-2">
              <Settings size={15} strokeWidth={2.2} className="text-juro-orange" />
              <span>Gaya Menu Interaksi</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Floating */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuStyle("floating");
                  soundEffects.playPop();
                }}
                className={`console-btn-bevel p-3 rounded-[4px] text-left border-2 cursor-pointer ${
                  actionMenuStyle === "floating"
                    ? "bg-[#FFF6EB] dark:bg-orange-500/15 border-juro-orange shadow-[0_2px_0_#18181B]"
                    : "bg-[#EFE9DC] dark:bg-[#101114] border-charcoal/70 dark:border-[#3F424E] hover:border-juro-orange"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-juro-orange shrink-0" />
                    <span>Melayang di Juro</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Ketuk Juro untuk membuka menu di dekatnya.
                </p>
              </button>

              {/* Option 2: Bottom Dock */}
              <button
                type="button"
                onClick={() => {
                  setActionMenuStyle("dock");
                  soundEffects.playPop();
                }}
                className={`console-btn-bevel p-3 rounded-[4px] text-left border-2 cursor-pointer ${
                  actionMenuStyle === "dock"
                    ? "bg-[#FFF6EB] dark:bg-orange-500/15 border-juro-orange shadow-[0_2px_0_#18181B]"
                    : "bg-[#EFE9DC] dark:bg-[#101114] border-charcoal/70 dark:border-[#3F424E] hover:border-juro-orange"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white flex items-center gap-1.5">
                    <LayoutGrid size={13} className="text-juro-orange shrink-0" />
                    <span>Bilah Bawah</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Menu aksi selalu tampil di bawah layar.
                </p>
              </button>
            </div>
          </Card>

          {/* Notifications & Reminders */}
          <Card shadowOffset="sm" className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white flex items-center gap-2">
                <Bell size={15} strokeWidth={2.2} className="text-juro-orange" />
                <span>Notifikasi</span>
              </h2>
              <Button
                label={testingNotif ? "Mengirim..." : "Tes Notifikasi"}
                size="sm"
                variant="secondary"
                disabled={testingNotif}
                onClick={handleTestNotification}
              />
            </div>

            <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] space-y-1.5">
              <PixelSwitch
                label="Aktifkan Notifikasi Pengingat"
                checked={notifEnabled}
                onChange={handleToggleNotifications}
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Kirim pengingat saat Juro lapar, lelah, kotor, atau dirawat pasangan.
              </p>
            </div>
          </Card>
        </div>

        {/* Android App (.apk) */}
        <Card shadowOffset="sm" className="p-4 h-full flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white flex items-center gap-2">
                <Smartphone size={15} strokeWidth={2.2} className="text-juro-orange" />
                <span>Aplikasi Android</span>
              </h2>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] space-y-1.5">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Pasang aplikasi Android untuk akses cepat dan notifikasi langsung.
              </p>
              <div className="font-mono-hud flex items-center gap-2 text-xs text-neutral-500">
                <span>Juro-Virtual-Pet.apk</span>
                <span>·</span>
                <a
                  href={RELEASES_PAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-juro-orange"
                >
                  Rilis GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex flex-wrap items-center gap-2">
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
        </Card>

        {/* Backup & Reset */}
        <Card shadowOffset="sm" className="p-4 h-full flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white flex items-center gap-2">
              <Database size={15} strokeWidth={2.2} className="text-juro-orange" />
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

          <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-200 flex items-center gap-1.5">
              <Play size={14} strokeWidth={2.2} className="text-juro-orange" />
              <span>Animasi Pembuka</span>
            </span>
            <Button
              label="Putar Ulang Intro"
              icon={Play}
              size="sm"
              variant="secondary"
              onClick={handleReplayIntro}
            />
          </div>

          <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <RotateCcw size={14} strokeWidth={2.2} />
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
    </section>
  );
};
