import React from "react";
import { Check, Lock, Pickaxe } from "lucide-react";
import { Card } from "../ui/Card";
import { ItemIllustration } from "../items/ItemIllustration";
import { PICKAXE_TIERS } from "../../data/economyCatalog";
import { PriceKeycapButton, ShopStatusStamp } from "./ShopPrimitives";

export interface ShopPickaxeTabProps {
  coins: number;
  pickaxeLevel: number;
  onUpgradePickaxe: (tierName: string, price: number) => void;
}

/**
 * Pickaxe tier upgrade ledger tab.
 */
export const ShopPickaxeTab: React.FC<ShopPickaxeTabProps> = ({
  coins,
  pickaxeLevel,
  onUpgradePickaxe,
}) => (
  <Card shadowOffset="sm" className="overflow-hidden">
    <div className="divide-y-2 divide-dashed divide-charcoal/15 dark:divide-[#3F424E]">
      {PICKAXE_TIERS.map((tier) => {
        const isOwned = pickaxeLevel >= tier.level;
        const isActive = pickaxeLevel === tier.level;
        const isNext = pickaxeLevel + 1 === tier.level;
        const canBuy = isNext && coins >= tier.price;

        return (
          <div
            key={tier.level}
            className={`px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
              isActive ? "bg-[#FFF5E9]/70 dark:bg-[#231B16]/70" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-9 h-9 rounded-[4px] border-2 font-pixel text-[11px] font-bold flex items-center justify-center shrink-0 ${
                  isActive
                    ? "bg-juro-orange text-white border-charcoal"
                    : isOwned
                    ? "bg-emerald-50 text-emerald-700 border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-[#EFE9DC] text-neutral-500 border-charcoal/30 dark:bg-[#101114] dark:border-[#3F424E]"
                }`}
              >
                L{tier.level}
              </span>

              <div className="w-11 h-11 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
                <ItemIllustration id={tier.illustrationId} size={30} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">{tier.name}</h3>
                <p className="font-mono-hud text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                  Daya {tier.power} · +{Math.round(tier.bonusChance * 100)}% Bonus Kristal
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] sm:pt-0 sm:border-t-0 flex items-center justify-end shrink-0 w-full sm:w-auto">
              {isActive ? (
                <ShopStatusStamp label="Aktif" icon={Check} tone="accent" className="w-full sm:w-auto" />
              ) : isOwned ? (
                <ShopStatusStamp label="Dimiliki" icon={Check} tone="good" className="w-full sm:w-auto" />
              ) : isNext ? (
                <PriceKeycapButton
                  label="Upgrade"
                  priceText={`${tier.price}`}
                  icon={Pickaxe}
                  disabled={!canBuy}
                  onClick={() => onUpgradePickaxe(tier.name, tier.price)}
                  className="w-full sm:w-auto"
                />
              ) : (
                <ShopStatusStamp
                  label={`Butuh Lv.${tier.level - 1}`}
                  icon={Lock}
                  tone="neutral"
                  className="w-full sm:w-auto"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);
