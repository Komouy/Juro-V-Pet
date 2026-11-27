import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  BookOpen,
  Copy,
  Check,
  X,
  LogOut,
  HeartHandshake,
  Utensils,
  Bath,
  Gamepad2,
  Moon,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { soundEffects } from "../../engine/audio/soundEffects";
import type { CareActionType } from "../../types/caregiver";
import { PixelSegmented } from "../ui/PixelSegmented";
import { PixelInput } from "../ui/PixelInput";
import { Button } from "../ui/Button";

interface CaregiverHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getActionIcon(type: CareActionType) {
  switch (type) {
    case "feed":
      return <Utensils size={13} className="text-orange-500" />;
    case "bath":
      return <Bath size={13} className="text-cyan-500" />;
    case "play":
      return <Gamepad2 size={13} className="text-emerald-500" />;
    case "sleep":
    case "wake":
      return <Moon size={13} className="text-indigo-400" />;
    case "pet":
      return <Heart size={13} className="text-pink-500" />;
    case "shop":
    case "skin":
    case "accessory":
      return <ShoppingBag size={13} className="text-amber-500" />;
    default:
      return <HeartHandshake size={13} className="text-emerald-500" />;
  }
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}h yang lalu`;
}

/**
 * Reusable Caregiver profile, 2P pairing, and care log panel.
 * Embedded inline in SettingsPage and reused by CaregiverHubModal.
 */
export const CaregiverHubPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<"pairing" | "logs">("pairing");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const {
    myProfile,
    activeRoomCode,
    partnerProfile,
    pairingStatus,
    connectionState,
    errorMessage,
    activityLogs,
    setProfile,
    createRoom,
    joinRoom,
    disconnectRoom,
  } = useCaregiverStore();

  const isPaired = activeRoomCode !== null;

  const connectionMeta = (() => {
    switch (connectionState) {
      case "connected":
        return {
          dotClass: "bg-emerald-500",
          textClass: "text-emerald-800 dark:text-emerald-300",
          label: "Tersambung",
        };
      case "connecting":
      case "reconnecting":
        return {
          dotClass: "bg-amber-400 animate-pulse",
          textClass: "text-amber-700 dark:text-amber-300",
          label: connectionState === "connecting" ? "Menyambungkan..." : "Menyambung kembali...",
        };
      default:
        return {
          dotClass: "bg-rose-500",
          textClass: "text-rose-700 dark:text-rose-400",
          label: "Terputus",
        };
    }
  })();

  const handleCopyCode = () => {
    if (!activeRoomCode) return;
    navigator.clipboard.writeText(activeRoomCode);
    setCopiedCode(true);
    soundEffects.playPop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartCreateRoom = async () => {
    soundEffects.playClick();
    await createRoom();
  };

  const handleStartJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundEffects.playClick();
    await joinRoom(joinCodeInput);
  };

  const handleSaveEditName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = editNameValue.trim();
    if (clean.length >= 2 && clean.length <= 20) {
      setProfile(clean);
      setIsEditingName(false);
      soundEffects.playSuccess();
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Users size={15} strokeWidth={2.2} className="text-juro-orange shrink-0" />
          <div>
            <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white leading-tight">
              Profil &amp; Perawat
            </h2>
            <p className="font-mono-hud text-[11px] text-neutral-600 dark:text-neutral-400">
              {isPaired ? `Kamar 2P (${activeRoomCode})` : "Perawatan mandiri"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="console-btn-bevel w-8 h-8 rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] bg-[#FDFBF7] dark:bg-[#101114] shadow-[0_2px_0_#18181B] inline-flex items-center justify-center text-charcoal hover:text-juro-orange dark:text-neutral-200 cursor-pointer"
            aria-label="Tutup dialog"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Console Tab Switcher */}
      <div className="mb-3 shrink-0">
        <PixelSegmented
          fullWidth
          className="w-full"
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "pairing", label: "Profil & 2P" },
            {
              value: "logs",
              label: "Buku Harian",
              badge: `${activityLogs.length}`,
            },
          ]}
        />
      </div>

      {/* Tab 1: Kemitraan (Pairing) */}
      {activeTab === "pairing" && (
        <div className="space-y-3">
          {/* Profil Saya Card */}
          <div className="p-3 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-pixel text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                  Profil kamu
                </span>
                {isEditingName ? (
                  <form onSubmit={handleSaveEditName} className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 min-w-0">
                      <PixelInput
                        compact
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        autoFocus
                        maxLength={20}
                      />
                    </div>
                    <Button type="submit" label="Simpan" size="sm" variant="accent" />
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="font-bold text-charcoal dark:text-white text-sm truncate">
                      {myProfile?.name || "Perawat"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditNameValue(myProfile?.name || "");
                        setIsEditingName(true);
                      }}
                      className="font-pixel text-[10px] font-bold uppercase text-juro-orange hover:underline cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-juro-orange text-white border-2 border-charcoal flex items-center justify-center font-pixel font-bold text-sm shrink-0">
                {myProfile?.name?.charAt(0).toUpperCase() || "P"}
              </div>
            </div>
          </div>

          {/* Status Kemitraan */}
          {isPaired ? (
            <div className="p-3 rounded-[4px] bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-700 dark:border-emerald-700 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-[1px] border border-charcoal shrink-0 ${connectionMeta.dotClass}`}
                  />
                  <span
                    className={`font-pixel text-[11px] font-bold uppercase truncate ${connectionMeta.textClass}`}
                  >
                    Kamar Pairing ({connectionMeta.label})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={disconnectRoom}
                  className="flex items-center gap-1 font-pixel text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <LogOut size={13} />
                  Putuskan
                </button>
              </div>

              {/* Kode Pairing Box */}
              <div className="flex items-center justify-between rounded-[4px] bg-[#FDFBF7] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] p-2.5">
                <div>
                  <span className="font-pixel text-[10px] uppercase text-neutral-500 dark:text-neutral-400 block">
                    Kode pairing
                  </span>
                  <span className="font-mono-hud text-base font-bold text-charcoal dark:text-white tracking-wider">
                    {activeRoomCode}
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={handleCopyCode}
                  icon={copiedCode ? Check : Copy}
                  label={copiedCode ? "Tersalin" : "Salin"}
                  size="sm"
                  variant="secondary"
                />
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {partnerProfile ? (
                  <>
                    Juro dirawat bersama oleh <strong>{myProfile?.name}</strong> dan{" "}
                    <strong>{partnerProfile.name}</strong>.
                  </>
                ) : (
                  <>Bagikan kode di atas agar teman atau pasangan bisa bergabung.</>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Buat Kamar Baru */}
              <div className="p-3 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] space-y-2">
                <h4 className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
                  Buat Kamar Baru
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Dapatkan kode untuk merawat Juro bersama secara sinkron.
                </p>
                <Button
                  type="button"
                  onClick={handleStartCreateRoom}
                  disabled={pairingStatus === "loading"}
                  label={pairingStatus === "loading" ? "Membuat..." : "Buat Kode Pairing"}
                  variant="accent"
                  size="sm"
                  className="w-full"
                />
              </div>

              {/* Gabung Kamar Pasangan */}
              <div className="p-3 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] space-y-2">
                <h4 className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
                  Gabung Kamar
                </h4>
                <form onSubmit={handleStartJoinRoom} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <PixelInput
                      compact
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: JURO-5821"
                      className="uppercase"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pairingStatus === "loading" || !joinCodeInput.trim()}
                    label="Gabung"
                    variant="primary"
                    size="sm"
                  />
                </form>
              </div>

              {errorMessage && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-center">
                  {errorMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Buku Harian Asuh */}
      {activeTab === "logs" && (
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {activityLogs.length === 0 ? (
            <div className="p-5 text-center text-neutral-500">
              <BookOpen size={26} className="mx-auto mb-2 opacity-40" />
              <p className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-neutral-300">
                Belum ada riwayat asuh
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Aktivitas perawatan Juro akan tercatat di sini.
              </p>
            </div>
          ) : (
            activityLogs.map((log) => {
              const isMe = log.caregiverId === myProfile?.id;
              return (
                <div
                  key={log.id}
                  className="p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] flex items-start gap-2.5"
                >
                  <span className="p-1.5 rounded-[3px] bg-[#FDFBF7] dark:bg-[#1E2028] border border-charcoal/60 dark:border-[#3F424E] shrink-0 mt-0.5">
                    {getActionIcon(log.actionType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-xs text-charcoal dark:text-white truncate">
                        {log.caregiverName} {isMe && "(Kamu)"}
                      </span>
                      <span className="font-mono-hud text-[11px] text-neutral-500 shrink-0">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                      {log.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const CaregiverHubModal: React.FC<CaregiverHubModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-charcoal/65 select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[6px_6px_0_#18181B] dark:shadow-[6px_6px_0_#09090B] p-5 max-h-[85vh] overflow-y-auto animate-scale-up"
      >
        <CaregiverHubPanel onClose={onClose} />
      </div>
    </div>,
    document.body
  );
};
