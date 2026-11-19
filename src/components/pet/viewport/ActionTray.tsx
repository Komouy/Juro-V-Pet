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
  onStartItemDrag,
  onDirectUse,
}) => {
  if (activeTray === "none") return null;

  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max max-w-[calc(100%-1.5rem)] transition-opacity duration-150 ${
        dragVisualMoved ? "opacity-30 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Pop-Up Food Pantry Strip (Real Consumable Stock — Drag onto Juro or Tap) */}
      {activeTray === "food" && (() => {
        const availableFoods = SHOP_FOODS.filter((f) => (foodInventory[f.id] ?? 0) > 0);
        return (
          <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
            <div className="flex items-center justify-between gap-3 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
              <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                Stok Makanan
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/shop?tab=food"
                  className="inline-flex items-center gap-1 pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal hover:bg-orange-600"
                >
                  <Store size={10} strokeWidth={2.5} />
                  <span>Toko</span>
                </Link>
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
                  aria-label="Tutup menu makanan"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {availableFoods.length === 0 ? (
              <div className="py-3 px-2 text-center space-y-2">
                <p className="pixel-text text-[9px] text-muted uppercase">
                  Stok makanan habis!
                </p>
                <Link
                  to="/shop?tab=food"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-juro-orange text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold"
                >
                  <Store size={12} strokeWidth={2.5} />
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
                      className="relative group shrink-0 w-24 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717] hover:border-juro-orange hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1 touch-none"
                    >
                      <span className="absolute top-1 right-1 pixel-text text-[8px] px-1 bg-charcoal text-white">
                        ×{stock}
                      </span>
                      <ItemIllustration id={food.id} size={34} />
                      <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold leading-tight line-clamp-2">
                        {food.name}
                      </span>
                      <div className="flex items-center gap-1 text-[8px] pixel-text">
                        <span className="text-juro-orange font-bold">+{food.hungerRestore}</span>
                        <span className="text-muted">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
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

      {/* Pop-Up Toy Shelf Strip (Permanent Owned Toys — Drag onto Juro or Tap) */}
      {activeTray === "toy" && (() => {
        const myToys = SHOP_TOYS.filter((t) => ownedToys.includes(t.id));
        return (
          <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
            <div className="flex items-center justify-between gap-3 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
              <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                Mainan Dimiliki
              </span>
              <div className="flex items-center gap-2">
                {myToys.length < SHOP_TOYS.length && (
                  <Link
                    to="/shop?tab=toy"
                    className="inline-flex items-center gap-1 pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal hover:bg-orange-600"
                  >
                    <Store size={10} strokeWidth={2.5} />
                    <span>Toko</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    soundEffects.playDismiss();
                    onClose();
                  }}
                  className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
                  aria-label="Tutup menu mainan"
                >
                  <X size={14} strokeWidth={2.5} />
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
                  className="group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717] hover:border-juro-orange hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                >
                  <ItemIllustration id={toy.id} size={36} />
                  <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold leading-tight">
                    {toy.name}
                  </span>
                  <div className="flex items-center gap-1 text-[8px] pixel-text">
                    <span className="text-rose-500 font-bold">+{toy.happinessGain}</span>
                    <span className="text-muted">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{toy.xpReward}XP
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pop-Up Interactive Bath Kit Strip: 1. Sabun Busa + 2. Ember Air */}
      {activeTray === "bath" && (
        <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
          <div className="flex items-center justify-between gap-4 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                Alat Mandi
              </span>
            </div>
            <button
              onClick={() => {
                soundEffects.playDismiss();
                onClose();
              }}
              className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
              aria-label="Tutup alat mandi"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Tool 1: Sabun Busa */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "soap" }, e)}
              className="group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 hover:border-sky-400 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ItemIllustration id="soap-bar" size={38} />
              <div className="flex flex-col items-center">
                <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold">
                  Sabun Busa
                </span>
                <span className="pixel-text text-[8px] text-sky-600 dark:text-sky-400">
                  Tarik ke Juro
                </span>
              </div>
            </button>

            {/* Tool 2: Ember Air */}
            <button
              type="button"
              onPointerDown={(e) => onStartItemDrag({ kind: "bucket" }, e)}
              className={`group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                soapBadgePercent >= 40
                  ? "border-sky-400 ring-2 ring-sky-400/40"
                  : "border-charcoal dark:border-neutral-700 hover:border-sky-400"
              }`}
            >
              <ItemIllustration id="water-bucket" size={38} />
              <div className="flex flex-col items-center">
                <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold">
                  Ember Air
                </span>
                <span className="pixel-text text-[8px] text-sky-600 dark:text-sky-400">
                  {soapBadgePercent >= 40 ? "Bilas busa!" : "Siram air"}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
