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

export const CaregiverHubModal: React.FC<CaregiverHubModalProps> = ({ isOpen, onClose }) => {
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
    errorMessage,
    activityLogs,
    setProfile,
    createRoom,
    joinRoom,
    disconnectRoom,
  } = useCaregiverStore();

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const isPaired = activeRoomCode !== null;

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

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-charcoal/70 backdrop-blur-xs select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] p-4 sm:p-5 max-h-[85vh] flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal dark:border-neutral-700 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-juro-orange text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717]">
              <Users size={16} />
            </span>
            <div>
              <h2 className="pixel-text text-[11px] uppercase font-bold text-charcoal dark:text-white leading-none">
                Profil & Perawat
              </h2>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans mt-0.5">
                {isPaired
                  ? `Kemitraan Aktif (${activeRoomCode})`
                  : "Perawatan Sendiri"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-charcoal dark:hover:text-white cursor-pointer"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-2 border-charcoal dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-0.5 mb-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("pairing");
              soundEffects.playClick();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 pixel-text text-[9px] uppercase font-bold cursor-pointer transition-all ${activeTab === "pairing"
              ? "bg-white dark:bg-neutral-900 text-charcoal dark:text-white border border-charcoal shadow-[1px_1px_0px_#171717]"
              : "text-neutral-500 hover:text-charcoal dark:hover:text-white"
              }`}
          >
            <HeartHandshake size={13} />
            Profil & 2P
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("logs");
              soundEffects.playClick();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 pixel-text text-[9px] uppercase font-bold cursor-pointer transition-all ${activeTab === "logs"
              ? "bg-white dark:bg-neutral-900 text-charcoal dark:text-white border border-charcoal shadow-[1px_1px_0px_#171717]"
              : "text-neutral-500 hover:text-charcoal dark:hover:text-white"
              }`}
          >
            <BookOpen size={13} />
            Buku Harian ({activityLogs.length})
          </button>
        </div>

        {/* Tab 1: Kemitraan (Pairing) */}
        {activeTab === "pairing" && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-sans">
            {/* Profil Saya Card */}
            <div className="p-3 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="pixel-text text-[8px] uppercase font-bold text-neutral-400">
                    Profil Kamu Saat Ini
                  </span>
                  {isEditingName ? (
                    <form onSubmit={handleSaveEditName} className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="px-2 py-0.5 border border-charcoal text-xs bg-warm-white dark:bg-neutral-900"
                        autoFocus
                        maxLength={20}
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-juro-orange text-white pixel-text text-[8px] border border-charcoal cursor-pointer"
                      >
                        Simpan
                      </button>
                    </form>
                  ) : (
                    <h3 className="font-bold text-charcoal dark:text-white text-sm flex items-center gap-1.5">
                      {myProfile?.name || "Perawat"}
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameValue(myProfile?.name || "");
                          setIsEditingName(true);
                        }}
                        className="pixel-text text-[8px] text-amber-600 underline cursor-pointer font-normal"
                      >
                        Ubah
                      </button>
                    </h3>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-charcoal flex items-center justify-center font-bold text-charcoal text-xs">
                  {myProfile?.name?.charAt(0).toUpperCase() || "P"}
                </div>
              </div>
            </div>

            {/* Status Kemitraan */}
            {isPaired ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 shadow-[2px_2px_0px_#171717] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="pixel-text text-[9px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                      Kamar Pairing Terhubung
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectRoom}
                    className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    <LogOut size={11} />
                    Putuskan
                  </button>
                </div>

                {/* Kode Pairing Box */}
                <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border-2 border-charcoal p-2">
                  <div>
                    <span className="pixel-text text-[8px] uppercase font-bold text-neutral-400 block">
                      Kode Pairing Bersama:
                    </span>
                    <span className="pixel-text text-[14px] font-bold text-charcoal dark:text-white tracking-widest">
                      {activeRoomCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 py-1 px-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 border border-charcoal pixel-text text-[8px] uppercase font-bold cursor-pointer"
                  >
                    {copiedCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedCode ? "Tersalin!" : "Salin"}
                  </button>
                </div>

                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  <p>
                    {partnerProfile ? (
                      <>
                        Juro saat ini dirawat bersama oleh <strong>{myProfile?.name}</strong> dan{" "}
                        <strong>{partnerProfile.name}</strong>. Setiap aksi makan, mandi, dan main otomatis tersinkron!
                      </>
                    ) : (
                      <>
                        Bagikan kode di atas kepada pasangan/sahabatmu agar ia bisa bergabung merawat Juro bersama.
                      </>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Buat Kamar Baru */}
                <div className="p-3 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717]">
                  <h4 className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white mb-1">
                    Buat Kamar Asuh Baru
                  </h4>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Dapatkan kode pairing untuk dibagikan ke pasangan atau sahabatmu.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreateRoom}
                    disabled={pairingStatus === "loading"}
                    className="w-full py-2 bg-juro-orange hover:bg-orange-600 active:translate-x-[1px] active:translate-y-[1px] text-white pixel-text text-[9px] uppercase font-bold border-2 border-charcoal shadow-[2px_2px_0px_#171717] cursor-pointer disabled:opacity-50"
                  >
                    {pairingStatus === "loading" ? "Membuat..." : "Buat Kode Pairing Baru"}
                  </button>
                </div>

                {/* Gabung Kamar Pasangan */}
                <div className="p-3 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717]">
                  <h4 className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white mb-1">
                     Gabung Kamar
                  </h4>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Punya kode? Masukkan di sini:
                  </p>
                  <form onSubmit={handleStartJoinRoom} className="flex gap-1.5">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Misal: JURO-5821"
                      className="flex-1 px-2.5 py-1.5 border-2 border-charcoal dark:border-neutral-600 text-xs font-mono uppercase bg-warm-white dark:bg-neutral-900"
                    />
                    <button
                      type="submit"
                      disabled={pairingStatus === "loading" || !joinCodeInput.trim()}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white pixel-text text-[9px] uppercase font-bold border-2 border-charcoal shadow-[2px_2px_0px_#171717] cursor-pointer disabled:opacity-50"
                    >
                      Gabung
                    </button>
                  </form>
                </div>

                {errorMessage && (
                  <p className="pixel-text text-[9px] text-red-600 dark:text-red-400 text-center">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Buku Harian Asuh (Activity Logs) */}
        {activeTab === "logs" && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-sans">
            {activityLogs.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                <p className="pixel-text text-[10px] uppercase">Belum ada riwayat asuh</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Setiap kali kamu atau pasangan memberi makan, memandikan, atau mengajak main Juro, riwayatnya akan tercatat di sini!
                </p>
              </div>
            ) : (
              activityLogs.map((log) => {
                const isMe = log.caregiverId === myProfile?.id;
                return (
                  <div
                    key={log.id}
                    className="p-2.5 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[1px_1px_0px_#171717] flex items-start gap-2.5"
                  >
                    <span className="p-1.5 bg-neutral-100 dark:bg-neutral-900 border border-charcoal shrink-0 mt-0.5">
                      {getActionIcon(log.actionType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-charcoal dark:text-white truncate">
                          {log.caregiverName} {isMe && "(Kamu)"}
                        </span>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {formatTimeAgo(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
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
    </div>,
    document.body
  );
};
