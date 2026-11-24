import React, { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";
export interface JuroChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  petName: string;
  hunger?: number;
  energy?: number;
  cleanliness?: number;
  happiness?: number;
  isSleeping?: boolean;
}

function getDynamicQuickPrompts(props: JuroChatModalProps): string[] {
  const prompts: string[] = [];

  if ((props.hunger ?? 100) < 45) {
    prompts.push("Kamu laper ya Juro?");
  }
  if ((props.cleanliness ?? 100) < 45) {
    prompts.push("Ayo kita mandi busa!");
  }
  if (props.isSleeping || (props.energy ?? 100) < 40) {
    prompts.push("Mau tidur nyenyak ya?");
  }
  if ((props.happiness ?? 100) < 45) {
    prompts.push("Juro jangan sedih ya!");
  }

  const defaults: string[] = [
    "Lagi ngapain Juro?",
    "Cerita dong tentang harimu!",
    "Kamu suka main apa?",
    "Ayo jalan-jalan di taman!",
  ];

  for (const d of defaults) {
    if (prompts.length >= 4) break;
    if (!prompts.includes(d)) {
      prompts.push(d);
    }
  }

  return prompts.slice(0, 4);
}

export const JuroChatModal: React.FC<JuroChatModalProps> = (props) => {
  const { isOpen, onClose, onSendMessage, isLoading, petName } = props;
  const [input, setInput] = useState("");
  const quickPrompts = getDynamicQuickPrompts(props);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleQuickPrompt = (prompt: string) => {
    soundEffects.playClick();
    onSendMessage(prompt);
  };

  return (
    <div className="animate-tray-enter absolute bottom-17 sm:bottom-19 left-1/2 -translate-x-1/2 z-30 w-84 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xl p-3.5 select-none">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-juro-orange" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
            {petName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEffects.playDismiss();
            onClose();
          }}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 cursor-pointer"
          aria-label="Tutup obrolan"
        >
          <X size={16} />
        </button>
      </div>

      {/* Dynamic Contextual Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(prompt)}
            className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200 hover:border-juro-orange hover:text-juro-orange active:scale-95 transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Kirim pesan untuk ${petName}...`}
          maxLength={100}
          disabled={isLoading}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-juro-orange focus:ring-2 focus:ring-juro-orange/20"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
            input.trim() && !isLoading
              ? "bg-juro-orange text-white hover:bg-orange-600 cursor-pointer active:scale-95"
              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-60"
          }`}
        >
          <Send size={13} strokeWidth={2} />
          <span>{isLoading ? "..." : "Kirim"}</span>
        </button>
      </form>
    </div>
  );
};
