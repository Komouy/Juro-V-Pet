import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ItemIllustration } from "../components/items/ItemIllustration";
import { Check, Coins, Gem, Palette, Pickaxe } from "lucide-react";
import { useGameStore } from "../stores/gameStore";
import { useUIStore } from "../stores/uiStore";
import { SKIN_CATALOG, getCrystalById } from "../data/economyCatalog";
import { soundEffects } from "../engine/audio/soundEffects";

export const CollectionPage: React.FC = () => {
  const { coins, crystals, unlockedSkins, activeSkin, unlockSkin, equipSkin, addLog } = useGameStore();
  const showToast = useUIStore((s) => s.showToast);

  const handleEquip = (skinId: string, name: string) => {
    if (equipSkin(skinId)) {
      soundEffects.playEquip();
      addLog("interaction", `Mengganti tampilan warna Juro ke ${name}.`);
      showToast(`Warna: ${name}`, "info");
    }
  };

  const handleUnlock = (skinId: string, name: string, costLabel: string) => {
    if (unlockSkin(skinId)) {
      soundEffects.playUnlock();
      addLog("interaction", `Membuka koleksi warna ${name} (-${costLabel})!`);
      showToast(`Terbuka: ${name}`, "success");
    } else {
      soundEffects.playError();
      showToast("Kristal belum cukup", "warn");
    }
  };

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-4 md:py-5 space-y-5">
      <div className="border-b-2 border-charcoal/15 dark:border-neutral-700 pb-3.5 flex items-center justify-between gap-2">
        <h1 className="pixel-text text-sm md:text-base text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2 shrink-0">
          <Palette size={16} strokeWidth={2.5} className="text-juro-orange" />
          <span>Koleksi</span>
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            title="Koin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-dark-surface border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
          >
            <Coins size={13} strokeWidth={2.5} className="text-amber-500" />
            <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white">
              {coins}
            </span>
          </div>
          <div
            title="Kristal Zamrud"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-dark-surface border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
          >
            <ItemIllustration id="crystal-emerald" size={16} />
            <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white">
              {crystals.emerald ?? 0}
            </span>
          </div>
          <div
            title="Kristal Ametis"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-dark-surface border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
          >
            <ItemIllustration id="crystal-amethyst" size={16} />
            <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white">
              {crystals.amethyst ?? 0}
            </span>
          </div>
          <Link to="/mine" className="hidden sm:inline-block">
            <Button label="Tambang" icon={Pickaxe} size="sm" variant="primary" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {SKIN_CATALOG.map((item) => {
          const isUnlocked = unlockedSkins.includes(item.id);
          const isSelected = activeSkin === item.id;

          const crystalInfo = item.crystalCost
            ? getCrystalById(item.crystalCost.crystalId)
            : null;
          const crystalShortName = crystalInfo
            ? crystalInfo.name.replace("Kristal ", "")
            : "";
          const requiredQty = item.crystalCost?.amount ?? 0;
          const ownedQty = item.crystalCost
            ? crystals[item.crystalCost.crystalId] ?? 0
            : 0;
          const canUnlock = !isUnlocked && ownedQty >= requiredQty;
          const costLabel = item.crystalCost ? `${requiredQty} ${crystalShortName}` : "";

          return (
            <Card
              key={item.id}
              shadowOffset="sm"
              className={`p-3.5 flex flex-col justify-between gap-3.5 transition-all ${
                isSelected ? "border-juro-orange ring-2 ring-juro-orange/25" : ""
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Mini Pixel-Framed Juro Jelly Preview */}
                <div className="relative w-14 h-14 bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] flex items-center justify-center shrink-0">
                  <div
                    className="relative w-10 h-9 rounded-t-full rounded-b-[14px] border-2 border-charcoal overflow-hidden flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, ${item.colorB} 0%, ${item.colorA} 72%)`,
                    }}
                  >
                    <span className="absolute top-1 left-2 w-2 h-1.5 bg-white/75 rounded-full" />
                    <span className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 bg-charcoal rounded-full relative">
                        <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full" />
                      </span>
                      <span className="w-1.5 h-1.5 bg-charcoal rounded-full relative">
                        <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full" />
                      </span>
                    </span>
                  </div>
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-juro-orange text-white border-2 border-charcoal flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                    {item.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {isSelected ? (
                      <Badge label="Aktif" variant="orange" size="sm" />
                    ) : isUnlocked ? (
                      <Badge label="Tersedia" variant="good" size="sm" />
                    ) : (
                      <Badge label={costLabel} variant="charcoal" size="sm" />
                    )}
                  </div>
                </div>
              </div>

              {isUnlocked ? (
                <Button
                  label={isSelected ? "Dipakai" : "Pakai"}
                  size="sm"
                  variant={isSelected ? "primary" : "secondary"}
                  disabled={isSelected}
                  onClick={() => handleEquip(item.id, item.name)}
                  className="w-full"
                />
              ) : (
                <Button
                  label={`Buka (${costLabel})`}
                  icon={Gem}
                  size="sm"
                  variant={canUnlock ? "accent" : "secondary"}
                  disabled={!canUnlock}
                  onClick={() => handleUnlock(item.id, item.name, costLabel)}
                  className="w-full"
                />
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
};
