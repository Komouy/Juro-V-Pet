import React from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Card } from "../ui/Card";
import { ItemIllustration } from "../items/ItemIllustration";
import { SHOP_TOYS } from "../../data/economyCatalog";
import { PriceKeycapButton, ShopStatusStamp } from "./ShopPrimitives";

export interface ShopToyTabProps {
  coins: number;
  ownedToys: string[];
  onBuyToy: (toyId: string, name: string, price: number) => void;
}

/**
 * Toy showcase tab displaying permanent toys for Juro.
 */
export const ShopToyTab: React.FC<ShopToyTabProps> = ({ coins, ownedToys, onBuyToy }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
    {SHOP_TOYS.map((toy) => {
      const isOwned = ownedToys.includes(toy.id);
      const canBuy = !isOwned && coins >= toy.price;

      return (
        <Card key={toy.id} shadowOffset="sm" className="p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
              <ItemIllustration id={toy.id} size={34} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">{toy.name}</h3>
              <p className="font-mono-hud text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                +{toy.happinessGain} Senang · +{toy.affectionGain} Sayang · +{toy.xpReward} XP
              </p>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex items-center justify-between gap-2">
            <span
              className={`font-mono-hud text-xs font-bold ${
                isOwned ? "text-emerald-600 dark:text-emerald-400" : "text-juro-orange"
              }`}
            >
              {isOwned ? "Permanen" : `${toy.price} Koin`}
            </span>

            {isOwned ? (
              <ShopStatusStamp label="Dimiliki" icon={Check} tone="good" />
            ) : (
              <PriceKeycapButton
                label="Beli"
                priceText={`${toy.price}`}
                icon={ShoppingBag}
                disabled={!canBuy}
                onClick={() => onBuyToy(toy.id, toy.name, toy.price)}
              />
            )}
          </div>
        </Card>
      );
    })}
  </div>
);
