import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Store,
  Coins,
  Gem,
  Pickaxe,
  Check,
  ShoppingBag,
  ArrowRightLeft,
  Palette,
  X,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PixelSegmented } from "../components/ui/PixelSegmented";
import { ItemIllustration } from "../components/items/ItemIllustration";
import { useGameStore } from "../stores/gameStore";
import { useUIStore } from "../stores/uiStore";
import { useCaregiverStore } from "../stores/caregiverStore";
import {
  CRYSTAL_CATALOG,
  HAT_CATALOG,
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
  const navigate = useNavigate();
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
    unlockedHats,
    activeHat,
    pickaxeLevel,
    buyFood,
    buyToy,
    unlockSkin,
    equipSkin,
    unlockHat,
    equipHat,
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
      useCaregiverStore.getState().recordAction(
        "shop",
        `Membeli ${qty}× ${name} di Toko (-${unitPrice * qty} koin).`,
        { coins: -(unitPrice * qty) }
      );
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
      useCaregiverStore.getState().recordAction(
        "shop",
        `Membeli mainan permanen ${name} (-${price} koin).`,
        { coins: -price }
      );
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
      useCaregiverStore.getState().recordAction(
        "skin",
        `Mengganti tampilan warna Juro ke ${name}.`,
        {}
      );
    }
  };

  const handleUnlockSkin = (skinId: string, name: string, costLabel: string) => {
    if (unlockSkin(skinId)) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Membuka warna ${name} (-${costLabel})!`);
      showToast(`Terbuka: ${name}`, "success");
      useCaregiverStore.getState().recordAction(
        "skin",
        `Membuka warna ${name} (-${costLabel})!`,
        {}
      );
    } else {
      soundEffects.playError();
      showToast("Kristal belum cukup", "warn");
    }
  };

  const handleEquipHat = (hatId: string, name: string) => {
    if (equipHat(hatId)) {
      soundEffects.playEquip();
      const logText =
        hatId === "hat-none" ? "Melepas topi Juro." : `Memakaikan ${name} pada Juro.`;
      addLog("interaction", logText);
      showToast(hatId === "hat-none" ? "Topi dilepas" : `Topi: ${name}`, "info");
      useCaregiverStore.getState().recordAction("accessory", logText, {});
    }
  };

  const handleUnlockHat = (hatId: string, name: string, price: number) => {
    if (unlockHat(hatId)) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Membeli ${name} di Toko (-${price} koin).`);
      showToast(`Terbuka: ${name}`, "success");
      useCaregiverStore.getState().recordAction(
        "shop",
        `Membeli ${name} di Toko (-${price} koin).`,
        { coins: -price }
      );
    } else {
      soundEffects.playError();
      showToast("Koin belum cukup", "warn");
    }
  };

  const handleSellCrystal = (id: CrystalId, name: string, qty: number) => {
    const earned = sellCrystal(id, qty);
    if (earned > 0) {
      soundEffects.playCash();
      triggerWalletPulse();
      addLog("interaction", `Menjual ${qty}× ${name} (+${earned} koin).`);
      showToast(`+${earned} Koin`, "success");
      useCaregiverStore.getState().recordAction(
        "shop",
        `Menjual ${qty}× ${name} (+${earned} koin).`,
        { coins: earned }
      );
    }
  };

  const handleSellAll = () => {
    const earned = sellAllCrystals();
    if (earned > 0) {
      soundEffects.playCash();
      triggerWalletPulse();
      addLog("interaction", `Menjual seluruh kristal (+${earned} koin).`);
      showToast(`Terjual semua (+${earned} Koin)`, "success");
      useCaregiverStore.getState().recordAction(
        "shop",
        `Menjual seluruh kristal (+${earned} koin).`,
        { coins: earned }
      );
    }
  };

  const handleUpgradePickaxe = (tierName: string, price: number) => {
    const success = upgradePickaxe();
    if (success) {
      soundEffects.playUnlock();
      triggerWalletPulse();
      addLog("interaction", `Upgrade beliung ke ${tierName} (-${price} koin).`);
      showToast(`Upgrade: ${tierName}`, "success");
      useCaregiverStore.getState().recordAction(
        "shop",
        `Upgrade beliung ke ${tierName} (-${price} koin).`,
        { coins: -price }
      );
    } else {
      soundEffects.playError();
      showToast("Koin belum cukup", "warn");
    }
  };

  return (
    <section className="w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Compact Overlay Header & Wallet Row */}
      <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-3.5 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 shrink-0">
          <Store size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Toko</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`inline-flex items-center gap-3 text-xs sm:text-sm font-semibold tabular-nums transition-transform ${
              walletPulse ? "animate-wallet-pop text-juro-orange" : "text-neutral-900 dark:text-white"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Coins size={14} strokeWidth={2.2} className="text-amber-500" />
              <span>{coins}</span>
            </span>
            <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5">
              <Gem size={14} strokeWidth={2.2} className="text-sky-500" />
              <span>{totalCrystals}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEffects.playDismiss();
              navigate("/");
            }}
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Tutup dan kembali ke Home"
            title="Kembali ke Home"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Category Switcher */}
      <div className="w-full flex items-center justify-between gap-3">
        <PixelSegmented
          fullWidthOnMobile
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "food", label: "Makanan" },
            { value: "toy", label: "Mainan" },
            { value: "skins", label: "Aksesoris" },
            {
              value: "sell",
              label: "Kristal",
              badge: totalCrystals > 0 ? `${totalCrystals}` : undefined,
            },
            { value: "tools", label: "Beliung" },
          ]}
        />
      </div>

      {/* Tab Content Stage */}
      <div className="w-full min-h-[340px]">
        {/* TAB 1: MAKANAN */}
        {activeTab === "food" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SHOP_FOODS.map((food) => {
              const stock = foodInventory[food.id] ?? 0;
              const canBuy1 = coins >= food.price;
              const canBuy3 = coins >= food.price * 3;

              return (
                <Card key={food.id} shadowOffset="sm" className="p-4 shadow-none flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                      <ItemIllustration id={food.id} size={34} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {food.name}
                        </h3>
                        <span
                          className={`text-xs font-semibold tabular-nums shrink-0 ${
                            stock > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-neutral-400"
                          }`}
                        >
                          ×{stock}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums truncate">
                        +{food.hungerRestore} Lapar · +{food.happinessGain} Senang · +{food.xpReward} XP
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canBuy1}
                      onClick={() => {
                        soundEffects.playClick();
                        handleBuyFood(food.id, food.name, 1, food.price);
                      }}
                      className={`w-full min-h-[40px] py-1.5 px-2.5 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${
                        canBuy1
                          ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100 dark:hover:bg-neutral-200"
                          : "bg-white text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                      }`}
                    >
                      <span className="block text-xs font-semibold leading-tight">Beli 1</span>
                      <span className="block text-[11px] opacity-80 tabular-nums leading-tight mt-0.5">
                        {food.price} Koin
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!canBuy3}
                      onClick={() => {
                        soundEffects.playClick();
                        handleBuyFood(food.id, food.name, 3, food.price);
                      }}
                      className="w-full min-h-[40px] py-1.5 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 hover:border-neutral-300 dark:hover:bg-neutral-750 text-center transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      <span className="block text-xs font-semibold leading-tight">Beli 3</span>
                      <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums leading-tight mt-0.5">
                        {food.price * 3} Koin
                      </span>
                    </button>
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
                <Card key={toy.id} shadowOffset="sm" className="p-4 shadow-none flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                      <ItemIllustration id={toy.id} size={34} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {toy.name}
                        </h3>
                        <span
                          className={`text-xs font-semibold tabular-nums shrink-0 ${
                            isOwned
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-juro-orange"
                          }`}
                        >
                          {isOwned ? "Milik" : `${toy.price} Koin`}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums truncate">
                        +{toy.happinessGain} Senang · +{toy.affectionGain} Sayang · +{toy.xpReward} XP
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {isOwned ? (
                      <Button
                        label="Dimiliki"
                        icon={Check}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full min-h-[40px]"
                      />
                    ) : (
                      <Button
                        label={`Beli (${toy.price} Koin)`}
                        icon={ShoppingBag}
                        size="sm"
                        variant={canBuy ? "primary" : "secondary"}
                        disabled={!canBuy}
                        onClick={() => handleBuyToy(toy.id, toy.name, toy.price)}
                        className="w-full min-h-[40px]"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 3: AKSESORIS JURO (TOPI & WARNA DIGABUNG DALAM 1 HALAMAN) */}
        {activeTab === "skins" && (
          <div className="space-y-6">
            {/* Bagian 1: Koleksi Topi (Bagian Atas) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} strokeWidth={2.2} className="text-juro-orange" />
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Koleksi Topi
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {unlockedHats.length} / {HAT_CATALOG.length} dimiliki
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
                      className={`p-4 shadow-none flex flex-col justify-between gap-3 transition-all ${
                        isSelected ? "border-juro-orange ring-1 ring-juro-orange/25" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                          <ItemIllustration id={hat.illustrationId} size={34} />
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-juro-orange text-white shadow-xs flex items-center justify-center">
                              <Check size={10} strokeWidth={2.8} />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {hat.name}
                          </h3>
                          <span
                            className={`text-xs font-semibold tabular-nums shrink-0 ${
                              isSelected
                                ? "text-juro-orange"
                                : isUnlocked
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {isSelected
                              ? "Aktif"
                              : isUnlocked
                              ? "Milik"
                              : hat.price > 0
                              ? `${hat.price} Koin`
                              : "Gratis"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        {isUnlocked ? (
                          <Button
                            label={
                              isSelected
                                ? "Dipakai"
                                : hat.id === "hat-none"
                                ? "Lepas Topi"
                                : "Pakai Topi"
                            }
                            icon={isSelected ? Check : ShoppingBag}
                            size="sm"
                            variant={isSelected ? "secondary" : "primary"}
                            disabled={isSelected}
                            onClick={() => handleEquipHat(hat.id, hat.name)}
                            className="w-full min-h-[40px]"
                          />
                        ) : (
                          <Button
                            label={`Beli (${hat.price} Koin)`}
                            icon={ShoppingBag}
                            size="sm"
                            variant={canBuy ? "primary" : "secondary"}
                            disabled={!canBuy}
                            onClick={() => handleUnlockHat(hat.id, hat.name, hat.price)}
                            className="w-full min-h-[40px]"
                          />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Bagian 2: Warna Tubuh Jeli (Bagian Bawah) */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Palette size={16} strokeWidth={2.2} className="text-juro-orange" />
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Warna Tubuh Jeli
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {unlockedSkins.length} / {SKIN_CATALOG.length} dimiliki
                </span>
              </div>

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
                      className={`p-4 shadow-none flex flex-col justify-between gap-3 transition-all ${
                        isSelected ? "border-juro-orange ring-1 ring-juro-orange/25" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
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
                            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-juro-orange text-white shadow-xs flex items-center justify-center">
                              <Check size={10} strokeWidth={2.8} />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {skin.name}
                          </h3>
                          <span
                            className={`text-xs font-semibold tabular-nums shrink-0 ${
                              isSelected
                                ? "text-juro-orange"
                                : isUnlocked
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {isSelected ? "Aktif" : isUnlocked ? "Milik" : costLabel}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        {isUnlocked ? (
                          <Button
                            label={isSelected ? "Dipakai" : "Pakai Warna"}
                            icon={isSelected ? Check : Palette}
                            size="sm"
                            variant={isSelected ? "secondary" : "primary"}
                            disabled={isSelected}
                            onClick={() => handleEquipSkin(skin.id, skin.name)}
                            className="w-full min-h-[40px]"
                          />
                        ) : (
                          <Button
                            label={`Buka (${costLabel})`}
                            icon={Gem}
                            size="sm"
                            variant={canUnlock ? "primary" : "secondary"}
                            disabled={!canUnlock}
                            onClick={() => handleUnlockSkin(skin.id, skin.name, costLabel)}
                            className="w-full min-h-[40px]"
                          />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: JUAL KRISTAL */}
        {activeTab === "sell" && (
          <div className="space-y-3.5">
            <Card
              variant="warm"
              shadowOffset="sm"
              className="p-4 shadow-none flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={16} strokeWidth={2.2} className="text-juro-orange" />
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                  {totalCrystals > 0
                    ? `${totalCrystals} Kristal · ~${totalCrystalValue} Koin`
                    : "Kantong kristal kosong"}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CRYSTAL_CATALOG.map((c) => {
                const count = crystals[c.id] ?? 0;
                const totalVal = count * c.sellPrice;

                return (
                  <Card key={c.id} shadowOffset="sm" className="p-4 shadow-none flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                        <ItemIllustration id={c.illustrationId} size={34} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {c.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between text-xs tabular-nums">
                          <span className="text-neutral-600 dark:text-neutral-300">
                            Stok: <strong className="text-juro-orange">×{count}</strong>
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {c.sellPrice} Koin
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2">
                      <Button
                        label={`Jual 1 (+${c.sellPrice})`}
                        size="sm"
                        variant="secondary"
                        disabled={count < 1}
                        onClick={() => handleSellCrystal(c.id, c.name, 1)}
                        className="w-full min-h-[40px]"
                      />
                      <Button
                        label={count > 0 ? `Semua (+${totalVal})` : "Semua"}
                        size="sm"
                        variant={count > 0 ? "primary" : "secondary"}
                        disabled={count < 1}
                        onClick={() => handleSellCrystal(c.id, c.name, count)}
                        className="w-full min-h-[40px]"
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
                  className={`p-4 shadow-none flex flex-col justify-between gap-3 ${
                    isActive ? "border-juro-orange ring-1 ring-juro-orange/25" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                      <ItemIllustration id={tier.illustrationId} size={34} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          Lv.{tier.level} · {tier.name}
                        </h3>
                        <span
                          className={`text-xs font-semibold tabular-nums shrink-0 ${
                            isActive
                              ? "text-juro-orange"
                              : isOwned
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {isActive ? "Aktif" : isOwned ? "Milik" : `${tier.price} Koin`}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums truncate">
                        Daya {tier.power} · +{Math.round(tier.bonusChance * 100)}% Bonus
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {isOwned ? (
                      <Button
                        label={isActive ? "Dipakai" : "Dimiliki"}
                        icon={Check}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full min-h-[40px]"
                      />
                    ) : isNext ? (
                      <Button
                        label={`Upgrade (${tier.price} Koin)`}
                        icon={Pickaxe}
                        size="sm"
                        variant={canBuy ? "primary" : "secondary"}
                        disabled={!canBuy}
                        onClick={() => handleUpgradePickaxe(tier.name, tier.price)}
                        className="w-full min-h-[40px]"
                      />
                    ) : (
                      <Button
                        label={`Buka Lv.${tier.level - 1}`}
                        size="sm"
                        variant="secondary"
                        disabled
                        className="w-full min-h-[40px]"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
