import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, X } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";
import { PixelInput } from "../../ui/PixelInput";
import {
  clearChatHistory,
  getChatHistory,
  onChatHistoryChanged,
  type ChatMessage,
} from "../../../services/petMemoryService";

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
    prompts.push("Apakah kamu lapar?");
  }
  if ((props.cleanliness ?? 100) < 45) {
    prompts.push("Ayo mandi busa!");
  }
  if (props.isSleeping || (props.energy ?? 100) < 40) {
    prompts.push("Sudah mengantuk?");
  }
  if ((props.happiness ?? 100) < 45) {
    prompts.push("Semangat ya, Juro!");
  }

  const defaults: string[] = [
    ""
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory());
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = getDynamicQuickPrompts(props);

  useEffect(() => {
    return onChatHistoryChanged((next) => {
      setMessages(next);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, messages.length, isLoading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onSendMessage(trimmed);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    soundEffects.playClick();
    onSendMessage(prompt);
  };

  const handleClearHistory = () => {
    soundEffects.playDismiss();
    clearChatHistory();
  };

  const recentMessages = messages.slice(-12);

  return (
    <div className="animate-tray-enter absolute bottom-17 sm:bottom-19 left-1/2 -translate-x-1/2 z-30 w-88 sm:w-[400px] max-w-[calc(100vw-1.5rem)] rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_5px_0_#18181B] dark:shadow-[0_5px_0_#09090B] p-3.5 select-none">
      <div className="flex items-center justify-between border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-juro-orange" />
          <span className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
            Obrolan · {petName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {recentMessages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal text-neutral-500 hover:text-rose-600 hover:bg-[#EFE9DC] dark:text-neutral-400 dark:hover:text-rose-400 dark:hover:bg-[#101114] cursor-pointer"
              aria-label="Hapus riwayat obrolan"
              title="Hapus riwayat obrolan"
            >
              <Trash2 size={14} strokeWidth={2.2} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEffects.playDismiss();
              onClose();
            }}
            className="p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal text-charcoal/70 hover:text-charcoal hover:bg-[#EFE9DC] dark:text-neutral-300 dark:hover:bg-[#101114] cursor-pointer"
            aria-label="Tutup obrolan"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Live Scrollable Conversation Transcript */}
      <div className="max-h-40 overflow-y-auto space-y-2 mb-3 pr-1">
        {recentMessages.length === 0 && !isLoading ? (
          <div className="p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border border-charcoal/30 dark:border-[#3F424E] text-xs text-neutral-600 dark:text-neutral-400 text-center">
            Mulai percakapan dengan {petName} melalui sapaan cepat atau ketik pesan di bawah.
          </div>
        ) : (
          recentMessages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 rounded-[4px] border-2 text-xs leading-relaxed ${
                    isUser
                      ? "bg-juro-orange text-white border-charcoal font-medium"
                      : "bg-[#EFE9DC] dark:bg-[#101114] text-charcoal dark:text-neutral-100 border-charcoal/70 dark:border-[#3F424E]"
                  }`}
                >
                  {!isUser && (
                    <span className="block font-pixel text-[9px] font-bold uppercase text-juro-orange mb-0.5">
                      {petName}
                    </span>
                  )}
                  <span className="select-text break-words">{msg.text}</span>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-2.5 py-1.5 rounded-[4px] border-2 border-charcoal/70 dark:border-[#3F424E] bg-[#EFE9DC] dark:bg-[#101114] inline-flex items-center gap-2">
              <span className="font-pixel text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                {petName} berpikir
              </span>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-juro-orange rounded-[1px] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-juro-orange rounded-[1px] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-juro-orange rounded-[1px] animate-bounce" />
              </span>
            </div>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Dynamic Contextual Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(prompt)}
            className="console-btn-bevel px-2.5 py-1 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] text-xs font-medium text-charcoal dark:text-neutral-200 hover:border-juro-orange hover:text-juro-orange disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Cartridge Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <PixelInput
            type="text"
            compact
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Kirim pesan untuk ${petName}...`}
            maxLength={100}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`console-btn-bevel h-[38px] px-3 rounded-[4px] border-2 border-charcoal font-pixel text-xs font-bold uppercase flex items-center gap-1.5 shrink-0 ${
            input.trim() && !isLoading
              ? "bg-juro-orange text-white shadow-[0_2px_0_#18181B] hover:bg-[#EA580C] cursor-pointer"
              : "bg-[#EFE9DC] dark:bg-[#101114] text-neutral-400 cursor-not-allowed opacity-60"
          }`}
        >
          <Send size={13} strokeWidth={2.2} />
          <span>{isLoading ? "..." : "Kirim"}</span>
        </button>
      </form>
    </div>
  );
};
