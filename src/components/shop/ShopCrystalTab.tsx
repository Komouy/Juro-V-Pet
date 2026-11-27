import React from "react";
import { ArrowRightLeft, Coins, Pickaxe } from "lucide-react";
import { Card } from "../ui/Card";
import { ItemIllustration } from "../items/ItemIllustration";
import { CRYSTAL_CATALOG, type CrystalId } from "../../data/economyCatalog";
import { NotchedActionKeycap, PriceKeycapButton, ShopStatusStamp } from "./ShopPrimitives";

export interface ShopCrystalTabProps {
  crystals: Record<CrystalId, number>;
  totalCrystals: number;
  totalCrystalValue: number;
  onSellCrystal: (id: CrystalId, name: string, qty: number) => void;
  onSellAll: () => void;
  onGoToMine: () => void;
}

/**
 * Crystal exchange counter tab for converting mined crystals into coins.
 */
export const ShopCrystalTab: React.FC<ShopCrystalTabProps> = ({
  crystals,
  totalCrystals,
  totalCrystalValue,
  onSellCrystal,
  onSellAll,
  onGoToMine,
}) => (
  <div className="space-y-3.5">
    <Card
      variant="warm"
      shadowOffset="sm"
      className="p-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[4px] bg-[#FDFBF7] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] flex items-center justify-center shrink-0">
          <ArrowRightLeft size={16} strokeWidth={2.2} className="text-juro-orange" />
        </div>
        <p className="font-mono-hud text-sm font-bold text-charcoal dark:text-white">
          {totalCrystals > 0
            ? `${totalCrystals} Kristal · ~${totalCrystalValue} Koin`
            : "Kantong kristal kosong"}
        </p>
      </div>

      {totalCrystals > 0 ? (
        <PriceKeycapButton
          label="Jual Semua"
          priceText={`+${totalCrystalValue}`}
          icon={Coins}
          onClick={onSellAll}
        />
      ) : (
        <PriceKeycapButton label="Ke Tambang" icon={Pickaxe} tone="charcoal" onClick={onGoToMine} />
      )}
    </Card>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {CRYSTAL_CATALOG.map((c) => {
        const count = crystals[c.id] ?? 0;
        const totalVal = count * c.sellPrice;

        return (
          <Card key={c.id} shadowOffset="sm" className="p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/80 dark:border-[#3F424E] flex items-center justify-center shrink-0">
                <ItemIllustration id={c.illustrationId} size={34} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">{c.name}</h3>
                  <span className="font-mono-hud text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {c.sellPrice} Koin
                  </span>
                </div>
                <p className="font-mono-hud text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  Stok: <strong className={count > 0 ? "text-juro-orange" : ""}>×{count}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex items-center justify-between gap-2">
              {count === 0 ? (
                <>
                  <span className="font-mono-hud text-[11px] text-neutral-500 dark:text-neutral-400">
                    Belum ada stok
                  </span>
                  <ShopStatusStamp label="Kosong" tone="neutral" />
                </>
              ) : (
                <>
                  <NotchedActionKeycap
                    label="Jual 1"
                    subText={`+${c.sellPrice}`}
                    onClick={() => onSellCrystal(c.id, c.name, 1)}
                    className="flex-1"
                  />
                  <PriceKeycapButton
                    label="Semua"
                    priceText={`+${totalVal}`}
                    icon={Coins}
                    onClick={() => onSellCrystal(c.id, c.name, count)}
                    className="flex-1"
                  />
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);
