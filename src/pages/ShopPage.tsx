import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Store,
  Coins,
  Gem,
  Pickaxe,
  Check,
  ShoppingBag,
  ArrowRightLeft,
  Palette,
  Lock,
  Utensils,
  Gamepad2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "../components/ui/Card";
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

interface PriceKeycapButtonProps {
  label: string;
  priceText?: string;
  icon?: LucideIcon;
  tone?: "orange" | "charcoal";
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Primary cartridge keycap button for shop purchases, upgrades, and bulk sales.
 */
const PriceKeycapButton: React.FC<PriceKeycapButtonProps> = ({
  label,
  priceText,
  icon: Icon,
  tone = "orange",
  disabled = false,
  onClick,
  className = "",
}) => {
  const toneStyle = disabled
    ? "bg-[#EFE9DC] text-neutral-500 border-charcoal/40 dark:bg-[#101114] dark:text-neutral-500 dark:border-[#3F424E]"
    : tone === "orange"
    ? "bg-juro-orange text-white border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_2px_0_#18181B] hover:bg-[#EA580C] active:shadow-none dark:border-[#3F424E] dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_2px_0_#09090B]"
    : "bg-charcoal text-[#FDFBF7] border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.16),0_2px_0_#09090B] hover:bg-[#27272A] active:shadow-none dark:bg-[#FDFBF7] dark:text-charcoal dark:border-[#3F424E]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 ${toneStyle} ${className}`}
    >
      {Icon && <Icon size={13} strokeWidth={2.3} className="shrink-0" />}
      <span className="font-pixel text-[11px] font-bold uppercase leading-none whitespace-nowrap">
        {label}
      </span>
      {priceText && (
        <span
          className={`font-mono-hud text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] leading-none whitespace-nowrap ${
            disabled
              ? "bg-charcoal/10 text-neutral-500 dark:bg-[#1E2028]"
              : "bg-black/20 text-white dark:bg-black/25"
          }`}
        >
          {priceText}
        </span>
      )}
    </button>
  );
};

interface NotchedActionKeycapProps {
  label: string;
  subText?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Secondary 45-degree chamfered cartridge keycap for quick stacks (x3) or single-unit sales.
 */
const NotchedActionKeycap: React.FC<NotchedActionKeycapProps> = ({
  label,
  subText,
  disabled = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel cartridge-chamfer p-[2px] min-h-[38px] cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0 transition-colors ${
        disabled
          ? "bg-charcoal/35 dark:bg-[#3F424E]"
          : "bg-charcoal hover:bg-juro-orange dark:bg-[#4A4E5E] dark:hover:bg-juro-orange"
      } ${className}`}
    >
      <span className="cartridge-chamfer w-full h-full px-2.5 py-1.5 bg-[#EFE9DC] dark:bg-[#101114] inline-flex items-center justify-center gap-1.5">
        <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white leading-none whitespace-nowrap">
          {label}
        </span>
        {subText && (
          <span className="font-mono-hud text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-none whitespace-nowrap">
            {subText}
          </span>
        )}
      </span>
    </button>
  );
};

interface EquipTogglePillProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

/**
 * Compact interactive pill button for equipping or removing unlocked cosmetics.
 */
const EquipTogglePill: React.FC<EquipTogglePillProps> = ({
  label,
  icon: Icon,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 border-charcoal dark:border-[#4A4E5E] bg-[#FDFBF7] dark:bg-[#101114] text-charcoal dark:text-white shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B] hover:border-juro-orange hover:text-juro-orange cursor-pointer select-none ${className}`}
    >
      <Icon size={13} strokeWidth={2.3} className="shrink-0 text-juro-orange" />
      <span className="font-pixel text-[11px] font-bold uppercase leading-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};

interface ShopStatusStampProps {
  label: string;
  icon?: LucideIcon;
  tone?: "accent" | "good" | "neutral";
  className?: string;
}

/**
 * Non-interactive inset stamp replacing static disabled rectangular buttons.
 */
const ShopStatusStamp: React.FC<ShopStatusStampProps> = ({
  label,
  icon: Icon,
  tone = "neutral",
  className = "",
}) => {
  const toneClass =
    tone === "accent"
      ? "bg-[#FFF5E9] text-juro-orange border-juro-orange/60 dark:bg-[#231B16] dark:text-orange-300 dark:border-juro-orange/50"
      : tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50"
      : "bg-[#EFE9DC]/80 text-neutral-500 border-charcoal/25 dark:bg-[#101114] dark:text-neutral-400 dark:border-[#3F424E]";

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 border-dashed font-pixel text-[11px] font-bold uppercase leading-none select-none whitespace-nowrap ${toneClass} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
};

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
  const totalFoodStock = SHOP_FOODS.reduce((acc, f) => acc + (foodInventory[f.id] ?? 0), 0);

  const tabSummaryLabel: Record<ShopTab, string> = {
    food: `${SHOP_FOODS.length} Menu · ${totalFoodStock} Stok`,
    toy: `${ownedToys.length}/${SHOP_TOYS.length} Dimiliki`,
    skins: `${unlockedHats.length + unlockedSkins.length}/${HAT_CATALOG.length + SKIN_CATALOG.length} Koleksi`,
    sell: `${totalCrystals} Kristal`,
    tools: `Beliung Lv.${pickaxeLevel}/${PICKAXE_TIERS.length}`,
  };

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
    <section className="w-full px-3.5 sm:px-6 py-4 sm:py-5 pb-5 sm:pb-6 space-y-3.5 sm:space-y-4">
      {/* Compact Console Header & Wallet Readout */}
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

      {/* Category Switcher + Contextual Summary Readout */}
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

      {/* Tab Content Stage */}
      <div className="w-full min-h-[340px]">
        {/* TAB 1: RAK KIOS MAKANAN (Unified 5-row Ledger — Zero Orphan Cards) */}
        {activeTab === "food" && (
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
                        onClick={() => handleBuyFood(food.id, food.name, 3, food.price)}
                      />
                      <PriceKeycapButton
                        label="Beli"
                        priceText={`${food.price}`}
                        icon={Coins}
                        disabled={!canBuy1}
                        onClick={() => handleBuyFood(food.id, food.name, 1, food.price)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* TAB 2: ETALASE MAINAN (Symmetrical 3-column Shelf) */}
        {activeTab === "toy" && (
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
                      <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">
                        {toy.name}
                      </h3>
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
                        onClick={() => handleBuyToy(toy.id, toy.name, toy.price)}
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 3: AKSESORIS JURO (Koleksi Topi 3-col + Warna Tubuh Jeli 5-col / Mobile Rows) */}
        {activeTab === "skins" && (
          <div className="space-y-6">
            {/* Bagian 1: Koleksi Topi (6 item -> 2 baris x 3 kolom penuh) */}
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
                          <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">
                            {hat.name}
                          </h3>
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
                          <ShopStatusStamp
                            label="Dipakai"
                            icon={Check}
                            tone="accent"
                            className="w-full"
                          />
                        ) : isUnlocked ? (
                          <EquipTogglePill
                            label={hat.id === "hat-none" ? "Lepas Topi" : "Pakai Topi"}
                            icon={ShoppingBag}
                            onClick={() => handleEquipHat(hat.id, hat.name)}
                            className="w-full"
                          />
                        ) : (
                          <PriceKeycapButton
                            label="Beli"
                            priceText={`${hat.price}`}
                            icon={ShoppingBag}
                            disabled={!canBuy}
                            onClick={() => handleUnlockHat(hat.id, hat.name, hat.price)}
                            className="w-full"
                          />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Bagian 2: Warna Tubuh Jeli (5 item -> 5 ubin sejajar di desktop, baris rapi di mobile) */}
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
                          <ShopStatusStamp
                            label="Dipakai"
                            icon={Check}
                            tone="accent"
                            className="lg:w-full"
                          />
                        ) : isUnlocked ? (
                          <EquipTogglePill
                            label="Pakai"
                            icon={Palette}
                            onClick={() => handleEquipSkin(skin.id, skin.name)}
                            className="lg:w-full"
                          />
                        ) : (
                          <PriceKeycapButton
                            label={costLabel}
                            icon={Gem}
                            disabled={!canUnlock}
                            onClick={() => handleUnlockSkin(skin.id, skin.name, costLabel)}
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
        )}

        {/* TAB 4: KONTER PENUKARAN KRISTAL (Summary Bar + Grid 2x2) */}
        {activeTab === "sell" && (
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
                  onClick={handleSellAll}
                />
              ) : (
                <PriceKeycapButton
                  label="Ke Tambang"
                  icon={Pickaxe}
                  tone="charcoal"
                  onClick={() => navigate("/mine")}
                />
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
                          <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">
                            {c.name}
                          </h3>
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
                            onClick={() => handleSellCrystal(c.id, c.name, 1)}
                            className="flex-1"
                          />
                          <PriceKeycapButton
                            label="Semua"
                            priceText={`+${totalVal}`}
                            icon={Coins}
                            onClick={() => handleSellCrystal(c.id, c.name, count)}
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
        )}

        {/* TAB 5: TANGGA PENINGKATAN BELIUNG (Sequential 5-step Progression Ledger) */}
        {activeTab === "tools" && (
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
                        <h3 className="text-sm font-bold text-charcoal dark:text-white truncate">
                          {tier.name}
                        </h3>
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
                          onClick={() => handleUpgradePickaxe(tier.name, tier.price)}
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
        )}
      </div>
    </section>
  );
};
