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
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xl p-5 max-h-[85vh] flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3.5 mb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-juro-orange">
              <Users size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                Profil & Perawat
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isPaired
                  ? `Kemitraan aktif (${activeRoomCode})`
                  : "Perawatan mandiri"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 cursor-pointer"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("pairing");
              soundEffects.playClick();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all ${
              activeTab === "pairing"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <HeartHandshake size={15} />
            Profil & 2P
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("logs");
              soundEffects.playClick();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all ${
              activeTab === "logs"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <BookOpen size={15} />
            Buku Harian ({activityLogs.length})
          </button>
        </div>

        {/* Tab 1: Kemitraan (Pairing) */}
        {activeTab === "pairing" && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* Profil Saya Card */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Profil kamu
                  </span>
                  {isEditingName ? (
                    <form onSubmit={handleSaveEditName} className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-900 focus:outline-none focus:border-juro-orange"
                        autoFocus
                        maxLength={20}
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-juro-orange text-white text-xs font-semibold cursor-pointer hover:bg-orange-600"
                      >
                        Simpan
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                        {myProfile?.name || "Perawat"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameValue(myProfile?.name || "");
                          setIsEditingName(true);
                        }}
                        className="text-xs font-medium text-juro-orange hover:underline cursor-pointer"
                      >
                        Ubah
                      </button>
                    </div>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/20 text-juro-orange flex items-center justify-center font-bold text-sm shrink-0">
                  {myProfile?.name?.charAt(0).toUpperCase() || "P"}
                </div>
              </div>
            </div>

            {/* Status Kemitraan */}
            {isPaired ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Kamar Pairing Terhubung
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectRoom}
                    className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <LogOut size={13} />
                    Putuskan
                  </button>
                </div>

                {/* Kode Pairing Box */}
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-2.5">
                  <div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                      Kode pairing
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white tracking-wider tabular-nums">
                      {activeRoomCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-100 cursor-pointer transition-colors"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedCode ? "Tersalin" : "Salin"}
                  </button>
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
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Buat Kamar Asuh Baru
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Dapatkan kode untuk merawat Juro bersama secara sinkron.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreateRoom}
                    disabled={pairingStatus === "loading"}
                    className="w-full py-2.5 rounded-xl bg-juro-orange hover:bg-orange-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {pairingStatus === "loading" ? "Membuat..." : "Buat Kode Pairing"}
                  </button>
                </div>

                {/* Gabung Kamar Pasangan */}
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Gabung Kamar
                  </h4>
                  <form onSubmit={handleStartJoinRoom} className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: JURO-5821"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm uppercase bg-white dark:bg-neutral-900 focus:outline-none focus:border-juro-orange"
                    />
                    <button
                      type="submit"
                      disabled={pairingStatus === "loading" || !joinCodeInput.trim()}
                      className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      Gabung
                    </button>
                  </form>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 text-center">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Buku Harian Asuh */}
        {activeTab === "logs" && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activityLogs.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
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
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-start gap-2.5"
                  >
                    <span className="p-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shrink-0 mt-0.5">
                      {getActionIcon(log.actionType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                          {log.caregiverName} {isMe && "(Kamu)"}
                        </span>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {formatTimeAgo(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-snug">
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
