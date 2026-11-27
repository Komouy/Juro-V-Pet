import React from "react";
import { Coins } from "lucide-react";
import { Card } from "../ui/Card";
import { ItemIllustration } from "../items/ItemIllustration";
import { SHOP_FOODS } from "../../data/economyCatalog";
import { NotchedActionKeycap, PriceKeycapButton } from "./ShopPrimitives";

export interface ShopFoodTabProps {
  coins: number;
  foodInventory: Record<string, number>;
  onBuyFood: (foodId: string, name: string, qty: number, unitPrice: number) => void;
}

/**
 * Food shop tab listing pantry snacks and bulk purchase actions.
 */
export const ShopFoodTab: React.FC<ShopFoodTabProps> = ({ coins, foodInventory, onBuyFood }) => (
  <Card shadowOffset="sm" className="overflow-hidden">
    <div className="divide-y-2 divide-dashed divide-charcoal/15 dark:divide-[#3F424E]">
      {SHOP_FOODS.map((food) => {
        const stock = foodInventory[food.id] ?? 0;
        const canBuy1 = coins >= food.price;
        const canBuy3 = coins >= food.price * 3;

        return (
          <div
            key={food.id}
            className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F4EFE6]/45 dark:hover:bg-[#16181F] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
                <ItemIllustration id={food.id} size={34} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">
                    {food.name}
                  </h3>
                  <span
                    className={`font-mono-hud text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] border shrink-0 leading-none ${
                      stock > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-600/35 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-[#EFE9DC] text-neutral-500 border-charcoal/15 dark:bg-[#101114] dark:border-[#3F424E]"
                    }`}
                  >
                    ×{stock}
                  </span>
                </div>
                <p className="font-mono-hud text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                  +{food.hungerRestore} Lapar · +{food.happinessGain} Senang · +{food.xpReward} XP
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] sm:pt-0 sm:border-t-0 grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto">
              <NotchedActionKeycap
                label="×3"
                subText={`${food.price * 3}`}
                disabled={!canBuy3}
                onClick={() => onBuyFood(food.id, food.name, 3, food.price)}
              />
              <PriceKeycapButton
                label="Beli"
                priceText={`${food.price}`}
                icon={Coins}
                disabled={!canBuy1}
                onClick={() => onBuyFood(food.id, food.name, 1, food.price)}
              />
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);
