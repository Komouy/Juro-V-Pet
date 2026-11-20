import React, { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Store,
  Coins,
  Gem,
  Pickaxe,
  Check,
  ShoppingBag,
  ArrowRightLeft,
  Palette,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { PixelSegmented } from "../components/ui/PixelSegmented";
import { ItemIllustration } from "../components/items/ItemIllustration";
import { useGameStore } from "../stores/gameStore";
import { useUIStore } from "../stores/uiStore";
import {
  CRYSTAL_CATALOG,
  PICKAXE_TIERS,
  SHOP_FOODS,
  SHOP_TOYS,
  SKIN_CATALOG,
  getCrystalById,
  type CrystalId,
} from "../data/economyCatalog";
import { soundEffects } from "../engine/audio/soundEffects";

type ShopTab = "food" | "toy" | "skins" | "sell" | "tools";

const VALID_TABS: ShopTab[] = ["food", "toy", "skins", "sell", "tools"];

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab") as ShopTab | null;
  const activeTab: ShopTab =
    initialTabParam && VALID_TABS.includes(initialTabParam) ? initialTabParam : "food";

  const setActiveTab = (tab: ShopTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const {
    coins,
    crystals,
    foodInventory,
    ownedToys,
    unlockedSkins,
    activeSkin,
    pickaxeLevel,
    buyFood,
    buyToy,
    unlockSkin,
    equipSkin,
    sellCrystal,
    sellAllCrystals,
    upgradePickaxe,
    addLog,
  } = useGameStore();
  const showToast = useUIStore((s) => s.showToast);

  const [walletPulse, setWalletPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const triggerWalletPulse = () => {
    setWalletPulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setWalletPulse(false);
      pulseTimerRef.current = null;
    }, 280);
  };

  const totalCrystals = CRYSTAL_CATALOG.reduce((acc, c) => acc + (crystals[c.id] ?? 0), 0);
  const totalCrystalValue = CRYSTAL_CATALOG.reduce(
    (acc, c) => acc + (crystals[c.id] ?? 0) * c.sellPrice,
    0
  );

  const handleBuyFood = (foodId: string, name: string, qty: number, unitPrice: number) => {
    const success = buyFood(foodId, qty);
    if (success) {
      soundEffects.playCash();
      triggerWalletPulse();
      addLog("interaction", `Membeli ${qty}× ${name} di Toko (-${unitPrice * qty} koin).`);
      showToast(`+${qty} ${name}`, "success");
    } else {
      soundEffects.playError();
      showToast("Koin belum cukup", "warn");
    }
  };

  const handleBuyToy = (toyId: string, name: string, price: number) => {
    const success = buyToy(toyId);
    if (success) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Membeli mainan permanen ${name} (-${price} koin).`);
      showToast(`${name} dimiliki`, "success");
    } else {
      soundEffects.playError();
      showToast("Koin belum cukup", "warn");
    }
  };

  const handleEquipSkin = (skinId: string, name: string) => {
    if (equipSkin(skinId)) {
      soundEffects.playEquip();
      addLog("interaction", `Mengganti tampilan warna Juro ke ${name}.`);
      showToast(`Warna: ${name}`, "info");
    }
  };

  const handleUnlockSkin = (skinId: string, name: string, costLabel: string) => {
    if (unlockSkin(skinId)) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Membuka warna ${name} (-${costLabel})!`);
      showToast(`Terbuka: ${name}`, "success");
    } else {
      soundEffects.playError();
      showToast("Kristal belum cukup", "warn");
    }
  };

  const handleSellCrystal = (id: CrystalId, name: string, qty: number) => {
    const earned = sellCrystal(id, qty);
    if (earned > 0) {
      soundEffects.playCash();
      triggerWalletPulse();
      addLog("interaction", `Menjual ${qty}× ${name} (+${earned} koin).`);
      showToast(`+${earned} Koin`, "success");
    }
  };

  const handleSellAll = () => {
    const earned = sellAllCrystals();
    if (earned > 0) {
      soundEffects.playCash();
      triggerWalletPulse();
      addLog("interaction", `Menjual seluruh kristal (+${earned} koin).`);
      showToast(`Terjual semua (+${earned} Koin)`, "success");
    }
  };

  const handleUpgradePickaxe = (tierName: string, price: number) => {
    const success = upgradePickaxe();
    if (success) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Upgrade beliung ke ${tierName} (-${price} koin).`);
      showToast(`Upgrade: ${tierName}`, "success");
    } else {
      soundEffects.playError();
      showToast("Koin belum cukup", "warn");
    }
  };

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-4 md:py-5 space-y-5">
      {/* Consistent Header & Wallet Row (Desktop & Mobile) */}
      <div className="border-b-2 border-charcoal/15 dark:border-neutral-700 pb-3.5 flex items-center justify-between gap-2">
        <h1 className="pixel-text text-sm md:text-base text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2 shrink-0">
          <Store size={16} strokeWidth={2.5} className="text-juro-orange" />
          <span>Toko</span>
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-dark-surface border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] ${
              walletPulse ? "animate-wallet-pop border-juro-orange" : ""
            }`}
          >
            <Coins size={13} strokeWidth={2.5} className="text-amber-500" />
            <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white">
              {coins}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-dark-surface border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] ${
              walletPulse ? "animate-wallet-pop" : ""
            }`}
          >
            <Gem size={13} strokeWidth={2.5} className="text-sky-500" />
            <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white">
              {totalCrystals}
            </span>
          </div>
          <Link to="/mine" className="hidden sm:inline-block">
            <Button label="Tambang" icon={Pickaxe} size="sm" variant="primary" />
          </Link>
        </div>
      </div>

      {/* Category Switcher (Full-Width Grid on Mobile, Stable Position Across All Tabs) */}
      <div className="w-full flex items-center justify-between gap-3">
        <PixelSegmented
          fullWidthOnMobile
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "food", label: "Makanan" },
            { value: "toy", label: "Mainan" },
            { value: "skins", label: "Warna Juro" },
            {
              value: "sell",
              label: "Kristal",
              badge: totalCrystals > 0 ? `${totalCrystals}` : undefined,
            },
            { value: "tools", label: "Beliung" },
          ]}
        />
      </div>

      {/* Fixed-Width, Non-Shifting Tab Content Stage */}
      <div className="w-full min-h-[380px]">
        {/* TAB 1: MAKANAN */}
        {activeTab === "food" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SHOP_FOODS.map((food) => {
              const stock = foodInventory[food.id] ?? 0;
              const canBuy1 = coins >= food.price;
              const canBuy3 = coins >= food.price * 3;

              return (
                <Card key={food.id} shadowOffset="sm" className="p-3.5 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-warm-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] shrink-0">
                      <ItemIllustration id={food.id} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                          {food.name}
                        </h3>
                        <Badge
                          label={`×${stock}`}
                          variant={stock > 0 ? "good" : "default"}
                          size="sm"
                        />
                      </div>
                      <p className="pixel-text text-[8px] sm:text-[9px] text-muted dark:text-neutral-400 mt-1.5 leading-relaxed">
                        +{food.hungerRestore} Lapar · +{food.happinessGain} Senang · +{food.xpReward} XP
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700 grid grid-cols-2 gap-2">
                    <Button
                      label={`×1 · ${food.price}`}
                      icon={ShoppingBag}
                      size="sm"
                      variant={canBuy1 ? "primary" : "secondary"}
                      disabled={!canBuy1}
                      onClick={() => handleBuyFood(food.id, food.name, 1, food.price)}
                      className="w-full"
                    />
                    <Button
                      label={`×3 · ${food.price * 3}`}
                      size="sm"
                      variant="secondary"
                      disabled={!canBuy3}
                      onClick={() => handleBuyFood(food.id, food.name, 3, food.price)}
                      className="w-full"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 2: MAINAN */}
        {activeTab === "toy" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SHOP_TOYS.map((toy) => {
              const isOwned = ownedToys.includes(toy.id);
              const canBuy = !isOwned && coins >= toy.price;

              return (
                <Card key={toy.id} shadowOffset="sm" className="p-3.5 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-warm-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] shrink-0">
                      <ItemIllustration id={toy.id} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                          {toy.name}
                        </h3>
                        {isOwned ? (
                          <Badge label="Milik" variant="good" size="sm" />
                        ) : (
                          <Badge label={`${toy.price}`} variant="orange" size="sm" />
                        )}
                      </div>
                      <p className="pixel-text text-[8px] sm:text-[9px] text-muted dark:text-neutral-400 mt-1.5 leading-relaxed">
                        +{toy.happinessGain} Senang · +{toy.affectionGain} Sayang · +{toy.xpReward} XP
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700">
                    {isOwned ? (
                      <Button
                        label="Dimiliki"
                        icon={Check}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full"
                      />
                    ) : (
                      <Button
                        label={`Beli (${toy.price} Koin)`}
                        icon={ShoppingBag}
                        size="sm"
                        variant={canBuy ? "primary" : "secondary"}
                        disabled={!canBuy}
                        onClick={() => handleBuyToy(toy.id, toy.name, toy.price)}
                        className="w-full"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 3: WARNA JURO */}
        {activeTab === "skins" && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {SKIN_CATALOG.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkin === skin.id;

                const crystalInfo = skin.crystalCost
                  ? getCrystalById(skin.crystalCost.crystalId)
                  : null;
                const crystalShortName = crystalInfo
                  ? crystalInfo.name.replace("Kristal ", "")
                  : "";
                const requiredQty = skin.crystalCost?.amount ?? 0;
                const ownedQty = skin.crystalCost
                  ? crystals[skin.crystalCost.crystalId] ?? 0
                  : 0;
                const canUnlock = !isUnlocked && ownedQty >= requiredQty;
                const costLabel = skin.crystalCost
                  ? `${requiredQty} ${crystalShortName}`
                  : "Gratis";

                return (
                  <Card
                    key={skin.id}
                    shadowOffset="sm"
                    className={`p-3.5 flex flex-col justify-between gap-3.5 transition-all ${
                      isSelected ? "border-juro-orange ring-2 ring-juro-orange/25" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Mini Pixel-Framed Juro Jelly Preview */}
                      <div className="relative w-14 h-14 bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] flex items-center justify-center shrink-0">
                        <div
                          className="relative w-10 h-9 rounded-t-full rounded-b-[14px] border-2 border-charcoal overflow-hidden flex items-center justify-center"
                          style={{
                            background: `radial-gradient(circle at 35% 28%, ${skin.colorB} 0%, ${skin.colorA} 72%)`,
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

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                            {skin.name}
                          </h3>
                          {isSelected ? (
                            <Badge label="Aktif" variant="orange" size="sm" />
                          ) : isUnlocked ? (
                            <Badge label="Milik" variant="good" size="sm" />
                          ) : (
                            <Badge label={costLabel} variant="charcoal" size="sm" />
                          )}
                        </div>
                        <p className="pixel-text text-[8px] sm:text-[9px] text-muted dark:text-neutral-400 mt-1.5 leading-relaxed">
                          {skin.flavorDesc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700">
                      {isUnlocked ? (
                        <Button
                          label={isSelected ? "Dipakai" : "Pakai Warna"}
                          icon={isSelected ? Check : Palette}
                          size="sm"
                          variant={isSelected ? "secondary" : "primary"}
                          disabled={isSelected}
                          onClick={() => handleEquipSkin(skin.id, skin.name)}
                          className="w-full"
                        />
                      ) : (
                        <Button
                          label={`Buka (${costLabel})`}
                          icon={Gem}
                          size="sm"
                          variant={canUnlock ? "primary" : "secondary"}
                          disabled={!canUnlock}
                          onClick={() => handleUnlockSkin(skin.id, skin.name, costLabel)}
                          className="w-full"
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: JUAL KRISTAL */}
        {activeTab === "sell" && (
          <div className="space-y-3.5">
            <Card
              variant="warm"
              shadowOffset="sm"
              className="p-3.5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600">
                  <ArrowRightLeft size={15} strokeWidth={2.5} className="text-juro-orange" />
                </div>
                <p className="pixel-text text-[10px] sm:text-xs text-charcoal dark:text-white font-bold">
                  {totalCrystals > 0
                    ? `${totalCrystals} Kristal · ~${totalCrystalValue} Koin`
                    : "Kantong Kristal Kosong"}
                </p>
              </div>

              {totalCrystals > 0 ? (
                <Button
                  label={`Jual Semua (+${totalCrystalValue})`}
                  icon={Coins}
                  size="sm"
                  variant="primary"
                  onClick={handleSellAll}
                />
              ) : (
                <Link to="/mine">
                  <Button label="Ke Tambang" icon={Pickaxe} size="sm" variant="primary" />
                </Link>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
              {CRYSTAL_CATALOG.map((c) => {
                const count = crystals[c.id] ?? 0;
                const totalVal = count * c.sellPrice;

                return (
                  <Card key={c.id} shadowOffset="sm" className="p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warm-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] shrink-0">
                        <ItemIllustration id={c.illustrationId} size={40} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                          {c.name}
                        </h3>
                        <div className="mt-1.5 flex items-center justify-between pixel-text text-[9px] sm:text-[10px]">
                          <span className="text-charcoal dark:text-neutral-200">
                            Stok: <strong className="text-juro-orange">×{count}</strong>
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {c.sellPrice} Koin
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700 grid grid-cols-2 gap-2">
                      <Button
                        label={`Jual 1 (+${c.sellPrice})`}
                        size="sm"
                        variant="secondary"
                        disabled={count < 1}
                        onClick={() => handleSellCrystal(c.id, c.name, 1)}
                        className="w-full"
                      />
                      <Button
                        label={count > 0 ? `Semua (+${totalVal})` : "Semua"}
                        size="sm"
                        variant={count > 0 ? "primary" : "secondary"}
                        disabled={count < 1}
                        onClick={() => handleSellCrystal(c.id, c.name, count)}
                        className="w-full"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: UPGRADE BELIUNG */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PICKAXE_TIERS.map((tier) => {
              const isOwned = pickaxeLevel >= tier.level;
              const isActive = pickaxeLevel === tier.level;
              const isNext = pickaxeLevel + 1 === tier.level;
              const canBuy = isNext && coins >= tier.price;

              return (
                <Card
                  key={tier.level}
                  variant={isActive ? "warm" : "default"}
                  shadowOffset="sm"
                  className={`p-3.5 flex flex-col justify-between gap-3 ${
                    isActive ? "border-juro-orange" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] shrink-0">
                      <ItemIllustration id={tier.illustrationId} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold truncate">
                          Lv.{tier.level} · {tier.name}
                        </h3>
                        {isActive ? (
                          <Badge label="Aktif" variant="orange" size="sm" />
                        ) : isOwned ? (
                          <Badge label="Milik" variant="good" size="sm" />
                        ) : (
                          <Badge label={`${tier.price}`} variant="charcoal" size="sm" />
                        )}
                      </div>
                      <p className="pixel-text text-[8px] sm:text-[9px] text-muted dark:text-neutral-400 mt-1.5 leading-relaxed">
                        Daya {tier.power} · +{Math.round(tier.bonusChance * 100)}% Bonus
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700">
                    {isOwned ? (
                      <Button
                        label={isActive ? "Dipakai" : "Dimiliki"}
                        icon={Check}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full"
                      />
                    ) : isNext ? (
                      <Button
                        label={`Upgrade (${tier.price} Koin)`}
                        icon={Pickaxe}
                        size="sm"
                        variant={canBuy ? "primary" : "secondary"}
                        disabled={!canBuy}
                        onClick={() => handleUpgradePickaxe(tier.name, tier.price)}
                        className="w-full"
                      />
                    ) : (
                      <Button
                        label={`Buka Lv.${tier.level - 1}`}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
