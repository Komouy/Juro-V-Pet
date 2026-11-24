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
          <div className="animate-tray-enter w-full rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xl p-3">
            <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                Stok Makanan
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/shop?tab=food"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-juro-orange text-white hover:bg-orange-600 transition-colors"
                >
                  <Store size={12} strokeWidth={2} />
                  <span>Toko</span>
                </Link>
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
                  aria-label="Tutup menu makanan"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {availableFoods.length === 0 ? (
              <div className="py-3 px-2 text-center space-y-2.5">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Stok makanan habis.
                </p>
                <Link
                  to="/shop?tab=food"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-juro-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                >
                  <Store size={14} strokeWidth={2} />
                  <span>Beli Makanan di Toko</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-stretch gap-2 overflow-x-auto max-w-[92vw] pb-0.5">
                {availableFoods.map((food) => {
                  const stock = foodInventory[food.id] ?? 0;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onPointerDown={(e) => onStartItemDrag({ kind: "food", food }, e)}
                      onClick={() => onDirectUse?.({ kind: "food", food })}
                      className="relative group shrink-0 w-24 p-2.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700 hover:border-juro-orange hover:bg-orange-50/40 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                    >
                      <span className="absolute top-1.5 right-2 text-[11px] font-semibold tabular-nums text-neutral-500 dark:text-neutral-400 leading-none">
                        ×{stock}
                      </span>
                      <ItemIllustration id={food.id} size={34} />
                      <span className="text-xs text-neutral-800 dark:text-white font-semibold leading-tight line-clamp-2">
                        {food.name}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] tabular-nums">
                        <span className="text-juro-orange font-semibold">+{food.hungerRestore}</span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          +{food.xpReward} XP
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
          <div className="animate-tray-enter w-full rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl p-3">
            <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                Koleksi Mainan
              </span>
              <div className="flex items-center gap-2">
                {myToys.length < SHOP_TOYS.length && (
                  <Link
                    to="/shop?tab=toy"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-juro-orange text-white hover:bg-orange-600 transition-colors"
                  >
                    <Store size={12} strokeWidth={2} />
                    <span>Toko</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
                  aria-label="Tutup menu mainan"
                >
                  <X size={16} strokeWidth={2} />
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
                  className="group min-w-0 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-juro-orange hover:bg-orange-50/40 dark:hover:bg-neutral-750 active:scale-95 transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                >
                  <ItemIllustration id={toy.id} size={36} />
                  <span className="text-xs text-neutral-800 dark:text-white font-semibold leading-tight">
                    {toy.name}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] tabular-nums">
                    <span className="text-rose-500 font-semibold">+{toy.happinessGain}</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{toy.xpReward} XP
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
        <div className="animate-tray-enter w-full rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl p-3">
          <div className="flex items-center justify-between gap-4 pb-2 mb-2.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
              Peralatan Mandi
            </span>
            <button
              onClick={() => {
                soundEffects.playDismiss();
                onClose();
              }}
              className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              aria-label="Tutup alat mandi"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Sabun Busa */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "soap" }, e)}
              onClick={() => onDirectUse?.({ kind: "soap" })}
              className="group min-w-0 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-sky-400 hover:bg-sky-50/40 dark:hover:bg-neutral-750 active:scale-95 transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ItemIllustration id="soap-bar" size={38} />
              <div className="flex flex-col items-center">
                <span className="text-xs text-neutral-800 dark:text-white font-semibold">
                  Sabun Busa
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  1. Gosokkan sabun
                </span>
              </div>
            </button>

            {/* Ember Air */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "bucket" }, e)}
              onClick={() => onDirectUse?.({ kind: "bucket" })}
              className={`group min-w-0 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border active:scale-95 transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                soapBadgePercent >= 40
                  ? "border-sky-400 ring-2 ring-sky-400/30"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-sky-400 hover:bg-sky-50/40"
              }`}
            >
              <ItemIllustration id="water-bucket" size={38} />
              <div className="flex flex-col items-center">
                <span className="text-xs text-neutral-800 dark:text-white font-semibold">
                  Ember Air
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
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
