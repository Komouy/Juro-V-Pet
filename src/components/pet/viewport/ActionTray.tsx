import React from "react";
import { Link } from "react-router-dom";
import { Store, X } from "lucide-react";
import { ItemIllustration } from "../../items/ItemIllustration";
import { SHOP_FOODS, SHOP_TOYS } from "../../../data/economyCatalog";
import { soundEffects } from "../../../engine/audio/soundEffects";
import type { FoodItem, ToyItem } from "../../../types/pet";

export type DragPayload =
  | { kind: "soap" }
  | { kind: "bucket" }
  | { kind: "food"; food: FoodItem }
  | { kind: "toy"; toy: ToyItem };

export interface ActionTrayProps {
  activeTray: "none" | "food" | "toy" | "bath";
  onClose: () => void;
  foodInventory: Record<string, number>;
  ownedToys: string[];
  soapBadgePercent: number;
  dragVisualMoved?: boolean;
  isDockMode?: boolean;
  onStartItemDrag: (payload: DragPayload, e: React.PointerEvent) => void;
  onDirectUse?: (payload: DragPayload) => void;
}

export const ActionTray: React.FC<ActionTrayProps> = ({
  activeTray,
  onClose,
  foodInventory,
  ownedToys,
  soapBadgePercent,
  dragVisualMoved = false,
  isDockMode = false,
  onStartItemDrag,
  onDirectUse,
}) => {
  if (activeTray === "none") return null;

  return (
    <div
      className={`absolute ${
        isDockMode ? "bottom-17 sm:bottom-19" : "bottom-4 sm:bottom-6"
      } left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max max-w-[calc(100%-1.5rem)] transition-opacity duration-150 ${
        dragVisualMoved ? "opacity-30 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Food Pantry Strip */}
      {activeTray === "food" && (() => {
        const availableFoods = SHOP_FOODS.filter((f) => (foodInventory[f.id] ?? 0) > 0);
        return (
          <div className="animate-tray-enter w-full rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] dark:shadow-[0_4px_0_#09090B] p-3">
            <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E]">
              <span className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
                Stok Makanan
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/shop?tab=food"
                  className="console-btn-bevel inline-flex items-center gap-1 font-pixel text-[11px] font-bold uppercase px-2.5 py-1 rounded-[4px] bg-juro-orange text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] hover:bg-[#EA580C]"
                >
                  <Store size={12} strokeWidth={2.2} />
                  <span>Toko</span>
                </Link>
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal text-charcoal/70 hover:text-charcoal hover:bg-[#EFE9DC] dark:text-neutral-300 dark:hover:bg-[#101114] cursor-pointer"
                  aria-label="Tutup menu makanan"
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {availableFoods.length === 0 ? (
              <div className="py-3 px-2 text-center space-y-2.5">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Stok makanan habis.
                </p>
                <Link
                  to="/shop?tab=food"
                  className="console-btn-bevel inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-juro-orange text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] font-pixel text-xs font-bold uppercase hover:bg-[#EA580C]"
                >
                  <Store size={13} strokeWidth={2.2} />
                  <span>Beli Makanan di Toko</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-stretch gap-2 overflow-x-auto max-w-[92vw] pb-1">
                {availableFoods.map((food) => {
                  const stock = foodInventory[food.id] ?? 0;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onPointerDown={(e) => onStartItemDrag({ kind: "food", food }, e)}
                      onClick={() => onDirectUse?.({ kind: "food", food })}
                      className="console-btn-bevel relative group shrink-0 w-24 p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-juro-orange hover:bg-[#FFF6EB] dark:hover:bg-[#191B22] cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                    >
                      <span className="font-mono-hud absolute top-1 right-1.5 text-[10px] font-bold text-charcoal/80 dark:text-neutral-300 leading-none">
                        ×{stock}
                      </span>
                      <ItemIllustration id={food.id} size={34} />
                      <span className="text-xs text-charcoal dark:text-white font-semibold leading-tight line-clamp-2">
                        {food.name}
                      </span>
                      <div className="font-mono-hud flex items-center gap-1 text-[10px] font-bold">
                        <span className="text-juro-orange">+{food.hungerRestore}</span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{food.xpReward}XP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Toy Shelf Strip */}
      {activeTray === "toy" && (() => {
        const myToys = SHOP_TOYS.filter((t) => ownedToys.includes(t.id));
        return (
          <div className="animate-tray-enter w-full rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] dark:shadow-[0_4px_0_#09090B] p-3">
            <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E]">
              <span className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
                Koleksi Mainan
              </span>
              <div className="flex items-center gap-2">
                {myToys.length < SHOP_TOYS.length && (
                  <Link
                    to="/shop?tab=toy"
                    className="console-btn-bevel inline-flex items-center gap-1 font-pixel text-[11px] font-bold uppercase px-2.5 py-1 rounded-[4px] bg-juro-orange text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] hover:bg-[#EA580C]"
                  >
                    <Store size={12} strokeWidth={2.2} />
                    <span>Toko</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal text-charcoal/70 hover:text-charcoal hover:bg-[#EFE9DC] dark:text-neutral-300 dark:hover:bg-[#101114] cursor-pointer"
                  aria-label="Tutup menu mainan"
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>
            <div
              className={`grid gap-2 ${
                myToys.length === 1
                  ? "grid-cols-1"
                  : myToys.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {myToys.map((toy) => (
                <button
                  key={toy.id}
                  type="button"
                  onPointerDown={(e) => onStartItemDrag({ kind: "toy", toy }, e)}
                  onClick={() => onDirectUse?.({ kind: "toy", toy })}
                  className="console-btn-bevel group min-w-0 p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-juro-orange hover:bg-[#FFF6EB] dark:hover:bg-[#191B22] cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                >
                  <ItemIllustration id={toy.id} size={36} />
                  <span className="text-xs text-charcoal dark:text-white font-semibold leading-tight">
                    {toy.name}
                  </span>
                  <div className="font-mono-hud flex items-center gap-1 text-[10px] font-bold">
                    <span className="text-rose-600">+{toy.happinessGain}</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{toy.xpReward}XP
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Interactive Bath Kit Strip */}
      {activeTray === "bath" && (
        <div className="animate-tray-enter w-full rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] dark:shadow-[0_4px_0_#09090B] p-3">
          <div className="flex items-center justify-between gap-4 pb-2 mb-2.5 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E]">
            <span className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white">
              Peralatan Mandi
            </span>
            <button
              onClick={() => {
                soundEffects.playDismiss();
                onClose();
              }}
              className="p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal text-charcoal/70 hover:text-charcoal hover:bg-[#EFE9DC] dark:text-neutral-300 dark:hover:bg-[#101114] cursor-pointer"
              aria-label="Tutup alat mandi"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Sabun Busa */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "soap" }, e)}
              onClick={() => onDirectUse?.({ kind: "soap" })}
              className="console-btn-bevel group min-w-0 p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-[#191B22] cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ItemIllustration id="soap-bar" size={38} />
              <div className="flex flex-col items-center">
                <span className="text-xs text-charcoal dark:text-white font-semibold">
                  Sabun Busa
                </span>
                <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  1. Gosokkan sabun
                </span>
              </div>
            </button>

            {/* Ember Air */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "bucket" }, e)}
              onClick={() => onDirectUse?.({ kind: "bucket" })}
              className={`console-btn-bevel group min-w-0 p-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 shadow-[0_2px_0_#18181B] cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                soapBadgePercent >= 40
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
                  : "border-charcoal dark:border-[#3F424E] hover:border-sky-500 hover:bg-sky-50"
              }`}
            >
              <ItemIllustration id="water-bucket" size={38} />
              <div className="flex flex-col items-center">
                <span className="text-xs text-charcoal dark:text-white font-semibold">
                  Ember Air
                </span>
                <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  2. Siram bersih
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
