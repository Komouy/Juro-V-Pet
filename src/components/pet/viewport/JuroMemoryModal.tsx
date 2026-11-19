import React, { useState, useCallback } from "react";
import { X, Sparkles, Trash2, Plus, Brain } from "lucide-react";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { soundEffects } from "../../../engine/audio/soundEffects";
import {
  getPetMemories,
  addPetMemory,
  removePetMemory,
  clearPetMemories,
  getChatHistory,
  clearChatHistory,
  type PetMemoryItem,
  type ChatMessage,
} from "../../../services/petMemoryService";

export interface JuroMemoryModalProps {
  open: boolean;
  onClose: () => void;
  petName?: string;
}

export const JuroMemoryModal: React.FC<JuroMemoryModalProps> = ({
  open,
  onClose,
  petName = "Juro",
}) => {
  const [activeTab, setActiveTab] = useState<"memories" | "history">("memories");
  const [memories, setMemories] = useState<PetMemoryItem[]>(() => getPetMemories());
  const [history, setHistory] = useState<ChatMessage[]>(() => getChatHistory());
  const [newMemoryInput, setNewMemoryInput] = useState("");

  const refreshData = useCallback(() => {
    setMemories(getPetMemories());
    setHistory(getChatHistory());
  }, []);

  if (!open) return null;

  const handleAddCustomMemory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemoryInput.trim();
    if (clean) {
      soundEffects.playClick();
      addPetMemory(clean, "custom");
      setNewMemoryInput("");
      refreshData();
    }
  };

  const handleDeleteMemory = (id: string) => {
    soundEffects.playClick();
    removePetMemory(id);
    refreshData();
  };

  const handleClearAllMemories = () => {
    if (window.confirm(`Hapus semua ingatan yang tersimpan di memori ${petName}?`)) {
      soundEffects.playClick();
      clearPetMemories();
      refreshData();
    }
  };

  const handleClearChatHistory = () => {
    if (window.confirm(`Hapus seluruh riwayat percakapan dengan ${petName}?`)) {
      soundEffects.playClick();
      clearChatHistory();
      refreshData();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="juro-memory-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-tray-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="warm" shadowOffset="md" className="p-4 sm:p-5 flex flex-col gap-3.5">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-charcoal/15 dark:border-neutral-700 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-juro-orange border-2 border-charcoal dark:border-neutral-600 flex items-center justify-center shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]">
                <Brain size={14} className="text-white" />
              </div>
              <div>
                <h2
                  id="juro-memory-title"
                  className="pixel-text text-xs sm:text-sm font-bold text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>Ingatan {petName}</span>
                  <Sparkles size={12} className="text-juro-orange" />
                </h2>
                <span className="pixel-text text-[8px] sm:text-[9px] text-muted block">
                  {memories.length} fakta diingat · {history.length} pesan
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-500 hover:text-charcoal dark:hover:text-white border-2 border-transparent hover:border-charcoal dark:hover:border-neutral-600 transition-colors cursor-pointer"
              aria-label="Tutup jendela ingatan"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-charcoal/10 dark:border-neutral-700 pb-1">
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                setActiveTab("memories");
              }}
              className={`pixel-text text-[9px] sm:text-[10px] px-3 py-1 font-bold uppercase tracking-wider transition-all cursor-pointer border-2 ${
                activeTab === "memories"
                  ? "bg-juro-orange text-white border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
                  : "bg-transparent text-charcoal/70 dark:text-neutral-400 border-transparent hover:text-charcoal dark:hover:text-white"
              }`}
            >
              Fakta Diingat ({memories.length})
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                setActiveTab("history");
              }}
              className={`pixel-text text-[9px] sm:text-[10px] px-3 py-1 font-bold uppercase tracking-wider transition-all cursor-pointer border-2 ${
                activeTab === "history"
                  ? "bg-juro-orange text-white border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
                  : "bg-transparent text-charcoal/70 dark:text-neutral-400 border-transparent hover:text-charcoal dark:hover:text-white"
              }`}
            >
              Riwayat Obrolan ({history.length})
            </button>
          </div>

          {/* Tab 1: Remembered Facts */}
          {activeTab === "memories" && (
            <div className="space-y-3">
              <form onSubmit={handleAddCustomMemory} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  placeholder="Beri tahu fakta baru untuk diingat Juro..."
                  maxLength={90}
                  className="flex-1 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 px-2.5 py-1.5 pixel-text text-[8px] sm:text-[9.5px] text-charcoal dark:text-white placeholder:text-neutral-400 focus:outline-none shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
                />
                <button
                  type="submit"
                  disabled={!newMemoryInput.trim()}
                  className={`p-1.5 border-2 border-charcoal dark:border-neutral-600 transition-all ${
                    newMemoryInput.trim()
                      ? "bg-juro-orange text-white hover:bg-orange-600 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-60"
                  }`}
                  aria-label="Tambah ingatan"
                  title="Tambah ingatan"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </form>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {memories.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed border-charcoal/20 dark:border-neutral-700">
                    <p className="pixel-text text-[9px] text-muted">
                      Belum ada ingatan khusus.
                    </p>
                    <p className="pixel-text text-[8px] text-neutral-400 mt-1">
                      Katakan &quot;namaku...&quot; atau &quot;aku suka...&quot; saat mengobrol, dan Juro akan mengingatnya secara otomatis!
                    </p>
                  </div>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 shadow-[1px_1px_0px_#171717] dark:shadow-[1px_1px_0px_#000000]"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-juro-orange shrink-0" />
                        <span className="pixel-text text-[8.5px] sm:text-[9.5px] text-charcoal dark:text-neutral-100 truncate">
                          {m.text}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-neutral-400 hover:text-red-500 p-1 shrink-0 transition-colors cursor-pointer"
                        title="Hapus ingatan ini"
                        aria-label="Hapus ingatan ini"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {memories.length > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleClearAllMemories}
                    className="pixel-text text-[8px] text-red-500 hover:underline cursor-pointer"
                  >
                    Hapus Semua Ingatan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Chat History Log */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {history.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed border-charcoal/20 dark:border-neutral-700">
                    <p className="pixel-text text-[9px] text-muted">
                      Belum ada riwayat percakapan.
                    </p>
                    <p className="pixel-text text-[8px] text-neutral-400 mt-1">
                      Klik atau tap Juro lalu kirim pesan untuk memulai obrolan!
                    </p>
                  </div>
                ) : (
                  history.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-0.5 ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge
                          label={msg.sender === "user" ? "Kamu" : petName}
                          variant={msg.sender === "user" ? "charcoal" : "orange"}
                          size="sm"
                        />
                        <span className="pixel-text text-[7px] text-neutral-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-2 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] ${
                          msg.sender === "user"
                            ? "bg-neutral-100 dark:bg-neutral-800 text-charcoal dark:text-neutral-100"
                            : "bg-white dark:bg-neutral-900 text-charcoal dark:text-neutral-100"
                        }`}
                      >
                        <p className="pixel-text text-[8.5px] sm:text-[9.5px] leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-charcoal/10 dark:border-neutral-700">
                  <span className="pixel-text text-[8px] text-muted">
                    Menyimpan hingga 40 pesan terakhir
                  </span>
                  <button
                    type="button"
                    onClick={handleClearChatHistory}
                    className="pixel-text text-[8px] text-red-500 hover:underline cursor-pointer"
                  >
                    Bersihkan Riwayat
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
