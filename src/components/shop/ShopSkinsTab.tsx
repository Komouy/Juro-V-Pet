import React from "react";
import { Check, Gem, Palette, ShoppingBag } from "lucide-react";
import { Card } from "../ui/Card";
import { ItemIllustration } from "../items/ItemIllustration";
import { HAT_CATALOG, SKIN_CATALOG, getCrystalById, type CrystalId } from "../../data/economyCatalog";
import { EquipTogglePill, PriceKeycapButton, ShopStatusStamp } from "./ShopPrimitives";

export interface ShopSkinsTabProps {
  coins: number;
  crystals: Record<CrystalId, number>;
  unlockedHats: string[];
  activeHat?: string;
  unlockedSkins: string[];
  activeSkin: string;
  onEquipHat: (hatId: string, name: string) => void;
  onUnlockHat: (hatId: string, name: string, price: number) => void;
  onEquipSkin: (skinId: string, name: string) => void;
  onUnlockSkin: (skinId: string, name: string, costLabel: string) => void;
}

/**
 * Accessories and jelly skin customization tab.
 */
export const ShopSkinsTab: React.FC<ShopSkinsTabProps> = ({
  coins,
  crystals,
  unlockedHats,
  activeHat,
  unlockedSkins,
  activeSkin,
  onEquipHat,
  onUnlockHat,
  onEquipSkin,
  onUnlockSkin,
}) => (
  <div className="space-y-6">
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-2">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} strokeWidth={2.2} className="text-juro-orange" />
          <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white">
            Koleksi Topi
          </h2>
        </div>
        <span className="font-mono-hud text-xs font-bold text-neutral-600 dark:text-neutral-400">
          {unlockedHats.length}/{HAT_CATALOG.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {HAT_CATALOG.map((hat) => {
          const isUnlocked = unlockedHats.includes(hat.id);
          const isSelected = (activeHat ?? "hat-none") === hat.id;
          const canBuy = coins >= hat.price;

          return (
            <Card
              key={hat.id}
              shadowOffset="sm"
              variant={isSelected ? "warm" : "default"}
              className={`p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                isSelected ? "border-juro-orange" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
                  <ItemIllustration id={hat.illustrationId} size={34} />
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-[2px] bg-juro-orange text-white border border-charcoal flex items-center justify-center">
                      <Check size={10} strokeWidth={2.8} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">{hat.name}</h3>
                  <p className="font-mono-hud text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {isSelected
                      ? "Sedang dipakai"
                      : isUnlocked
                      ? "Sudah dimiliki"
                      : hat.price > 0
                      ? `${hat.price} Koin`
                      : "Gratis"}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex items-center justify-end">
                {isSelected ? (
                  <ShopStatusStamp label="Dipakai" icon={Check} tone="accent" className="w-full" />
                ) : isUnlocked ? (
                  <EquipTogglePill
                    label={hat.id === "hat-none" ? "Lepas Topi" : "Pakai Topi"}
                    icon={ShoppingBag}
                    onClick={() => onEquipHat(hat.id, hat.name)}
                    className="w-full"
                  />
                ) : (
                  <PriceKeycapButton
                    label="Beli"
                    priceText={`${hat.price}`}
                    icon={ShoppingBag}
                    disabled={!canBuy}
                    onClick={() => onUnlockHat(hat.id, hat.name, hat.price)}
                    className="w-full"
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>

    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-2">
        <div className="flex items-center gap-2">
          <Palette size={16} strokeWidth={2.2} className="text-juro-orange" />
          <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-white">
            Warna Tubuh Jeli
          </h2>
        </div>
        <span className="font-mono-hud text-xs font-bold text-neutral-600 dark:text-neutral-400">
          {unlockedSkins.length}/{SKIN_CATALOG.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {SKIN_CATALOG.map((skin) => {
          const isUnlocked = unlockedSkins.includes(skin.id);
          const isSelected = activeSkin === skin.id;

          const crystalInfo = skin.crystalCost ? getCrystalById(skin.crystalCost.crystalId) : null;
          const crystalShortName = crystalInfo ? crystalInfo.name.replace("Kristal ", "") : "";
          const requiredQty = skin.crystalCost?.amount ?? 0;
          const ownedQty = skin.crystalCost ? crystals[skin.crystalCost.crystalId] ?? 0 : 0;
          const canUnlock = !isUnlocked && ownedQty >= requiredQty;
          const costLabel = skin.crystalCost ? `${requiredQty} ${crystalShortName}` : "Gratis";

          return (
            <Card
              key={skin.id}
              shadowOffset="sm"
              variant={isSelected ? "warm" : "default"}
              className={`p-3 flex flex-row lg:flex-col items-center justify-between gap-3 transition-colors ${
                isSelected ? "border-juro-orange" : ""
              }`}
            >
              <div className="flex flex-row lg:flex-col items-center gap-3 lg:gap-2 min-w-0 flex-1 lg:w-full">
                <div className="relative w-12 h-12 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
                  <div
                    className="relative w-9 h-8 rounded-t-full rounded-b-[12px] border border-black/15 shadow-xs overflow-hidden flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, ${skin.colorB} 0%, ${skin.colorA} 72%)`,
                    }}
                  >
                    <span className="absolute top-1 left-2 w-2 h-1.5 bg-white/75 rounded-full" />
                    <span className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full relative">
                        <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full" />
                      </span>
                      <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full relative">
                        <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full" />
                      </span>
                    </span>
                  </div>
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-[2px] bg-juro-orange text-white border border-charcoal flex items-center justify-center">
                      <Check size={10} strokeWidth={2.8} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 lg:text-center lg:w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-charcoal dark:text-white truncate">
                    {skin.name}
                  </h3>
                  <p className="font-mono-hud text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {isSelected ? "Aktif" : isUnlocked ? "Terbuka" : costLabel}
                  </p>
                </div>
              </div>

              <div className="shrink-0 lg:w-full lg:pt-2.5 lg:border-t-2 lg:border-dashed lg:border-charcoal/15 dark:lg:border-[#3F424E]">
                {isSelected ? (
                  <ShopStatusStamp label="Dipakai" icon={Check} tone="accent" className="lg:w-full" />
                ) : isUnlocked ? (
                  <EquipTogglePill
                    label="Pakai"
                    icon={Palette}
                    onClick={() => onEquipSkin(skin.id, skin.name)}
                    className="lg:w-full"
                  />
                ) : (
                  <PriceKeycapButton
                    label={costLabel}
                    icon={Gem}
                    disabled={!canUnlock}
                    onClick={() => onUnlockSkin(skin.id, skin.name, costLabel)}
                    className="lg:w-full"
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  </div>
);
