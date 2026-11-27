import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Store, Coins, Gem, Pickaxe, Palette, Utensils, Gamepad2, X } from "lucide-react";
import { PixelSegmented } from "../components/ui/PixelSegmented";
import { ShopFoodTab } from "../components/shop/ShopFoodTab";
import { ShopToyTab } from "../components/shop/ShopToyTab";
import { ShopSkinsTab } from "../components/shop/ShopSkinsTab";
import { ShopCrystalTab } from "../components/shop/ShopCrystalTab";
import { ShopPickaxeTab } from "../components/shop/ShopPickaxeTab";
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
  type CrystalId,
} from "../data/economyCatalog";
import { soundEffects } from "../engine/audio/soundEffects";
import type { CareActionType } from "../types/caregiver";

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

  const commitTransaction = (opts: {
    ok: boolean;
    sound: "cash" | "unlock" | "equip";
    pulse?: boolean;
    logText: string;
    toastText: string;
    toastTone?: "success" | "info";
    careAction: CareActionType;
    coinDelta?: number;
    failToast: string;
  }) => {
    if (!opts.ok) {
      soundEffects.playError();
      showToast(opts.failToast, "warn");
      return;
    }
    if (opts.sound === "cash") soundEffects.playCash();
    else if (opts.sound === "unlock") soundEffects.playUnlock();
    else soundEffects.playEquip();

    if (opts.pulse) triggerWalletPulse();
    addLog("interaction", opts.logText);
    showToast(opts.toastText, opts.toastTone ?? "success");
    useCaregiverStore
      .getState()
      .recordAction(opts.careAction, opts.logText, opts.coinDelta ? { coins: opts.coinDelta } : {});
  };

  const totalCrystals = CRYSTAL_CATALOG.reduce((acc, c) => acc + (crystals[c.id] ?? 0), 0);
  const totalCrystalValue = CRYSTAL_CATALOG.reduce(
    (acc, c) => acc + (crystals[c.id] ?? 0) * c.sellPrice,
    0
  );
  const totalFoodStock = SHOP_FOODS.reduce((acc, f) => acc + (foodInventory[f.id] ?? 0), 0);

  const tabSummaryLabel: Record<ShopTab, string> = {
    food: `${SHOP_FOODS.length} Menu · ${totalFoodStock} Stok`,
    toy: `${ownedToys.length}/${SHOP_TOYS.length} Dimiliki`,
    skins: `${unlockedHats.length + unlockedSkins.length}/${HAT_CATALOG.length + SKIN_CATALOG.length} Koleksi`,
    sell: `${totalCrystals} Kristal`,
    tools: `Beliung Lv.${pickaxeLevel}/${PICKAXE_TIERS.length}`,
  };

  const handleBuyFood = (foodId: string, name: string, qty: number, unitPrice: number) =>
    commitTransaction({
      ok: buyFood(foodId, qty),
      sound: "cash",
      pulse: true,
      logText: `Membeli ${qty}× ${name} di Toko (-${unitPrice * qty} koin).`,
      toastText: `+${qty} ${name}`,
      careAction: "shop",
      coinDelta: -(unitPrice * qty),
      failToast: "Koin belum cukup",
    });

  const handleBuyToy = (toyId: string, name: string, price: number) =>
    commitTransaction({
      ok: buyToy(toyId),
      sound: "unlock",
      pulse: true,
      logText: `Membeli mainan permanen ${name} (-${price} koin).`,
      toastText: `${name} dimiliki`,
      careAction: "shop",
      coinDelta: -price,
      failToast: "Koin belum cukup",
    });

  const handleEquipSkin = (skinId: string, name: string) =>
    commitTransaction({
      ok: equipSkin(skinId),
      sound: "equip",
      logText: `Mengganti tampilan warna Juro ke ${name}.`,
      toastText: `Warna: ${name}`,
      toastTone: "info",
      careAction: "skin",
      failToast: "Gagal mengganti warna",
    });

  const handleUnlockSkin = (skinId: string, name: string, costLabel: string) =>
    commitTransaction({
      ok: unlockSkin(skinId),
      sound: "unlock",
      pulse: true,
      logText: `Membuka warna ${name} (-${costLabel})!`,
      toastText: `Terbuka: ${name}`,
      careAction: "skin",
      failToast: "Kristal belum cukup",
    });

  const handleEquipHat = (hatId: string, name: string) => {
    const logText = hatId === "hat-none" ? "Melepas topi Juro." : `Memakaikan ${name} pada Juro.`;
    commitTransaction({
      ok: equipHat(hatId),
      sound: "equip",
      logText,
      toastText: hatId === "hat-none" ? "Topi dilepas" : `Topi: ${name}`,
      toastTone: "info",
      careAction: "accessory",
      failToast: "Gagal memakai topi",
    });
  };

  const handleUnlockHat = (hatId: string, name: string, price: number) =>
    commitTransaction({
      ok: unlockHat(hatId),
      sound: "unlock",
      pulse: true,
      logText: `Membeli ${name} di Toko (-${price} koin).`,
      toastText: `Terbuka: ${name}`,
      careAction: "shop",
      coinDelta: -price,
      failToast: "Koin belum cukup",
    });

  const handleSellCrystal = (id: CrystalId, name: string, qty: number) => {
    const earned = sellCrystal(id, qty);
    if (earned <= 0) return;
    commitTransaction({
      ok: true,
      sound: "cash",
      pulse: true,
      logText: `Menjual ${qty}× ${name} (+${earned} koin).`,
      toastText: `+${earned} Koin`,
      careAction: "shop",
      coinDelta: earned,
      failToast: "",
    });
  };

  const handleSellAll = () => {
    const earned = sellAllCrystals();
    if (earned <= 0) return;
    commitTransaction({
      ok: true,
      sound: "cash",
      pulse: true,
      logText: `Menjual seluruh kristal (+${earned} koin).`,
      toastText: `Terjual semua (+${earned} Koin)`,
      careAction: "shop",
      coinDelta: earned,
      failToast: "",
    });
  };

  const handleUpgradePickaxe = (tierName: string, price: number) =>
    commitTransaction({
      ok: upgradePickaxe(),
      sound: "unlock",
      pulse: true,
      logText: `Upgrade beliung ke ${tierName} (-${price} koin).`,
      toastText: `Upgrade: ${tierName}`,
      careAction: "shop",
      coinDelta: -price,
      failToast: "Koin belum cukup",
    });

  return (
    <section className="w-full px-3.5 sm:px-6 py-4 sm:py-5 pb-5 sm:pb-6 space-y-3.5 sm:space-y-4">
      <div className="border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-3 flex items-center justify-between gap-2.5">
        <h1 className="font-pixel text-sm sm:text-lg font-bold uppercase text-charcoal dark:text-white tracking-wide flex items-center gap-2 shrink-0">
          <Store size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Toko</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className={`inline-flex items-center gap-2.5 px-2.5 py-1 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] font-mono-hud text-xs sm:text-sm font-bold transition-transform ${
              walletPulse ? "animate-wallet-pop text-juro-orange" : "text-charcoal dark:text-white"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Coins size={14} strokeWidth={2.2} className="text-amber-500" />
              <span>{coins}</span>
            </span>
            <span className="w-0.5 h-3.5 bg-charcoal/25 dark:bg-[#3F424E]" aria-hidden="true" />
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
            className="console-btn-bevel w-8 h-8 rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] bg-[#FDFBF7] dark:bg-[#101114] shadow-[0_2px_0_#18181B] inline-flex items-center justify-center text-charcoal hover:text-juro-orange dark:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Tutup dan kembali ke Home"
            title="Kembali ke Home"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="w-full flex items-stretch gap-2.5">
        <PixelSegmented
          mobileDropdown
          fullWidth
          className="flex-1 min-w-0"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "food", label: "Makanan", icon: Utensils },
            { value: "toy", label: "Mainan", icon: Gamepad2 },
            { value: "skins", label: "Aksesoris", icon: Palette },
            {
              value: "sell",
              label: "Kristal",
              icon: Gem,
              badge: totalCrystals > 0 ? `${totalCrystals}` : undefined,
            },
            { value: "tools", label: "Beliung", icon: Pickaxe },
          ]}
        />

        <span className="hidden md:inline-flex items-center px-3 rounded-[5px] bg-[#EFE9DC]/80 dark:bg-[#101114] border-2 border-dashed border-charcoal/25 dark:border-[#3F424E] font-mono-hud text-xs font-bold text-charcoal/80 dark:text-neutral-300 shrink-0 whitespace-nowrap">
          {tabSummaryLabel[activeTab]}
        </span>
      </div>

      <div className="w-full min-h-[340px]">
        {activeTab === "food" && (
          <ShopFoodTab coins={coins} foodInventory={foodInventory} onBuyFood={handleBuyFood} />
        )}
        {activeTab === "toy" && (
          <ShopToyTab coins={coins} ownedToys={ownedToys} onBuyToy={handleBuyToy} />
        )}
        {activeTab === "skins" && (
          <ShopSkinsTab
            coins={coins}
            crystals={crystals}
            unlockedHats={unlockedHats}
            activeHat={activeHat}
            unlockedSkins={unlockedSkins}
            activeSkin={activeSkin}
            onEquipHat={handleEquipHat}
            onUnlockHat={handleUnlockHat}
            onEquipSkin={handleEquipSkin}
            onUnlockSkin={handleUnlockSkin}
          />
        )}
        {activeTab === "sell" && (
          <ShopCrystalTab
            crystals={crystals}
            totalCrystals={totalCrystals}
            totalCrystalValue={totalCrystalValue}
            onSellCrystal={handleSellCrystal}
            onSellAll={handleSellAll}
            onGoToMine={() => navigate("/mine")}
          />
        )}
        {activeTab === "tools" && (
          <ShopPickaxeTab
            coins={coins}
            pickaxeLevel={pickaxeLevel}
            onUpgradePickaxe={handleUpgradePickaxe}
          />
        )}
      </div>
    </section>
  );
};
