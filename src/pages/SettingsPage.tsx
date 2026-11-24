import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PixelInput } from "../components/ui/PixelInput";
import { PixelSwitch } from "../components/ui/PixelSwitch";
import { usePetStore } from "../stores/petStore";
import { useUIStore } from "../stores/uiStore";
import type { GraphicsQualitySetting } from "../engine/world/graphicsProfile";
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
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Cpu,
  X,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { name } = usePetStore();
  const {
    theme,
    soundEnabled,
    actionMenuStyle,
    graphicsQuality,
    weather,
    toggleTheme,
    toggleSound,
    setActionMenuStyle,
    setGraphicsQuality,
    setWeather,
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
  };

  return (
    <section className="w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-3.5 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 shrink-0">
          <Settings size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Pengaturan</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            soundEffects.playDismiss();
            navigate("/");
          }}
          className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Tutup dan kembali ke Home"
          title="Kembali ke Home"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        {/* Pet Name */}
        <Card shadowOffset="sm" className="p-4 shadow-none">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <User size={16} strokeWidth={2.2} className="text-juro-orange" />
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

        {/* Preferences */}
        <Card shadowOffset="sm" className="p-4 shadow-none">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3.5 flex items-center gap-2">
            <Sliders size={16} strokeWidth={2.2} className="text-juro-orange" />
            <span>Tampilan & Suara</span>
          </h2>

          <div className="space-y-4">
            <PixelSwitch
              label="Mode Gelap"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <div className="border-t border-neutral-100 dark:border-neutral-800" />
            <PixelSwitch
              label="Efek Suara"
              checked={soundEnabled}
              onChange={toggleSound}
            />
            <div className="border-t border-neutral-100 dark:border-neutral-800" />
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 block">
                Waktu & Suasana Lembah
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                {[
                  { id: "auto", label: "Otomatis", icon: Sliders },
                  { id: "cerah", label: "Siang", icon: Sun },
                  { id: "senja", label: "Sore", icon: Sunset },
                  { id: "malam", label: "Malam", icon: Moon },
                  { id: "hujan", label: "Hujan", icon: CloudRain },
                ].map((item) => {
                  const isSelected =
                    weather === item.id ||
                    (item.id === "cerah" && weather === "clear") ||
                    (item.id === "hujan" && weather === "rain");
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setWeather(item.id as any);
                        showToast(`Suasana diubah ke ${item.label}`, "success");
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-juro-orange text-white border-juro-orange shadow-xs font-semibold"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                    >
                      <Icon size={15} className="mb-1" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800" />
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Cpu size={14} className="text-juro-orange" />
                <span>Kualitas Grafis 3D</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {(
                  [
                    { id: "auto", label: "Otomatis", desc: "Sesuai perangkat" },
                    { id: "low", label: "Ringan", desc: "Hemat RAM" },
                    { id: "balanced", label: "Seimbang", desc: "Tajam & lancar" },
                    { id: "high", label: "Tinggi", desc: "Detail maksimal" },
                  ] as Array<{ id: GraphicsQualitySetting; label: string; desc: string }>
                ).map((preset) => {
                  const isSelected = graphicsQuality === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setGraphicsQuality(preset.id);
                        showToast(`Kualitas grafis diubah ke ${preset.label}`, "success");
                      }}
                      className={`flex flex-col items-start justify-center p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-juro-orange text-white border-juro-orange shadow-xs"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                    >
                      <span className="text-xs font-semibold">{preset.label}</span>
                      <span
                        className={`text-[11px] mt-0.5 ${
                          isSelected
                            ? "text-white/90"
                            : "text-neutral-500 dark:text-neutral-400"
                        }`}
                      >
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Interaction Style */}
        <Card shadowOffset="sm" className="p-4 shadow-none md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Settings size={16} strokeWidth={2.2} className="text-juro-orange" />
            <span>Gaya Menu Interaksi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Floating */}
            <button
              type="button"
              onClick={() => {
                setActionMenuStyle("floating");
                soundEffects.playPop();
              }}
              className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                actionMenuStyle === "floating"
                  ? "bg-orange-50/70 dark:bg-orange-500/15 border-juro-orange ring-1 ring-juro-orange"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-juro-orange/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare size={15} className="text-juro-orange" />
                  <span>Melayang di Juro</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Ketuk tubuh Juro untuk membuka menu dan obrolan di dekatnya.
              </p>
            </button>

            {/* Option 2: Bottom Dock */}
            <button
              type="button"
              onClick={() => {
                setActionMenuStyle("dock");
                soundEffects.playPop();
              }}
              className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                actionMenuStyle === "dock"
                  ? "bg-orange-50/70 dark:bg-orange-500/15 border-juro-orange ring-1 ring-juro-orange"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-juro-orange/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <LayoutGrid size={15} className="text-juro-orange" />
                  <span>Bilah Bawah</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Menu aksi dan obrolan selalu tampil di bagian bawah layar.
              </p>
            </button>
          </div>
        </Card>

        {/* Notifications & Reminders */}
        <Card shadowOffset="sm" className="p-4 shadow-none md:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Bell size={16} strokeWidth={2.2} className="text-juro-orange" />
              <span>Notifikasi & Pengingat</span>
            </h2>
            <Button
              label={testingNotif ? "Mengirim..." : "Tes Notifikasi"}
              size="sm"
              variant="secondary"
              disabled={testingNotif}
              onClick={handleTestNotification}
            />
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
            <PixelSwitch
              label="Aktifkan Notifikasi Pengingat"
              checked={notifEnabled}
              onChange={handleToggleNotifications}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Kirim pengingat saat Juro lapar, lelah, kotor, atau dirawat pasangan.
            </p>
          </div>
        </Card>

        {/* Android App (.apk) */}
        <Card shadowOffset="sm" className="p-4 shadow-none md:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Smartphone size={16} strokeWidth={2.2} className="text-juro-orange" />
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

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Pasang aplikasi Android untuk akses cepat dan notifikasi langsung.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
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
        </Card>

        {/* Backup & Reset */}
        <Card shadowOffset="sm" className="p-4 shadow-none md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Database size={16} strokeWidth={2.2} className="text-juro-orange" />
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

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
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
