import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Pickaxe,
  ArrowDown,
  Zap,
  Store,
  RotateCcw,
  Coins,
  Gem,
  Layers,
  ChevronRight,
  Check,
  Clock,
  X,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ItemIllustration } from "../components/items/ItemIllustration";
import { useGameStore } from "../stores/gameStore";
import { useUIStore } from "../stores/uiStore";
import { useCaregiverStore } from "../stores/caregiverStore";
import {
  CRYSTAL_CATALOG,
  getCrystalById,
  getPickaxeTier,
  type CrystalId,
} from "../data/economyCatalog";
import {
  MAX_MINING_STAMINA,
  MINE_DIG_COOLDOWN_MS,
  MINE_RESET_COST,
  MIN_TILES_DUG_TO_REROLL_SAME_FLOOR,
  STAMINA_REGEN_MS,
  type MineTile,
  type RockKind,
} from "../engine/mining/mineGenerator";
import { soundEffects } from "../engine/audio/soundEffects";

interface DebrisParticle {
  dx: number;
  dy: number;
  size: number;
  color: string;
}

interface TileEffectBurst {
  uid: number;
  tileId: number;
  text: string;
  textColor: string;
  ringColor?: string;
  crystalIllustrationId?: string;
  showPickaxe: boolean;
  particles: DebrisParticle[];
}

const ROCK_DEBRIS_COLORS: Record<RockKind, string[]> = {
  dirt: ["#92400E", "#B45309", "#D97706", "#78350F"],
  stone: ["#64748B", "#94A3B8", "#475569", "#CBD5E1"],
  deep: ["#334155", "#475569", "#1E293B", "#94A3B8"],
};

function createDebrisParticles(
  rock: RockKind,
  accentColor?: string,
  count = 6
): DebrisParticle[] {
  const palette = ROCK_DEBRIS_COLORS[rock];
  return Array.from({ length: count }, (_, idx) => {
    const angle = (idx / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const dist = 24 + Math.random() * 24;
    const useAccent = Boolean(accentColor) && idx % 2 === 0;
    return {
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist - 10),
      size: useAccent ? 7 : 5 + (idx % 3),
      color: useAccent && accentColor ? accentColor : palette[idx % palette.length],
    };
  });
}

function formatCountdownSeconds(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const MiningPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    coins,
    crystals,
    pickaxeLevel,
    deepestFloor,
    miningStamina,
    miningStaminaUpdatedAt,
    mineFloor,
    mineTiles,
    mineResetCooldownUntil,
    syncMiningStamina,
    digMineTile,
    descendMineFloor,
    resetMineToFloor,
  } = useGameStore();
  const showToast = useUIStore((s) => s.showToast);

  const [floorTransitionKey, setFloorTransitionKey] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());

  // Animation states
  const [shakingTileId, setShakingTileId] = useState<number | null>(null);
  const [flashTileId, setFlashTileId] = useState<number | null>(null);
  const [boardShakePhase, setBoardShakePhase] = useState<0 | 1 | 2>(0);
  const [bursts, setBursts] = useState<TileEffectBurst[]>([]);
  const [highlightedCrystal, setHighlightedCrystal] = useState<CrystalId | null>(null);

  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const boardShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDigAtRef = useRef(0);
  const burstSeqRef = useRef(0);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const triggerBoardShake = useCallback(() => {
    setBoardShakePhase((prev) => (prev === 1 ? 2 : 1));
    if (boardShakeTimerRef.current) {
      clearTimeout(boardShakeTimerRef.current);
      timersRef.current.delete(boardShakeTimerRef.current);
    }
    boardShakeTimerRef.current = scheduleTimeout(() => {
      boardShakeTimerRef.current = null;
      setBoardShakePhase(0);
    }, 240);
  }, [scheduleTimeout]);

  useEffect(() => {
    const timerSet = timersRef.current;
    return () => {
      timerSet.forEach((id) => clearTimeout(id));
      timerSet.clear();
    };
  }, []);

  // Sync persisted real-time stamina regen & drive live 1s countdown HUD
  useEffect(() => {
    syncMiningStamina();
    const interval = setInterval(() => {
      const now = Date.now();
      syncMiningStamina(now);
      setClockNow(now);
    }, 1000);
    return () => clearInterval(interval);
  }, [syncMiningStamina]);

  const activePickaxe = getPickaxeTier(pickaxeLevel);
  const ladderRevealed = mineTiles.some((t) => t.dug && t.reward.kind === "ladder");
  const dugCount = mineTiles.filter((t) => t.dug).length;

  const nextStaminaMs =
    miningStamina < MAX_MINING_STAMINA
      ? Math.max(0, STAMINA_REGEN_MS - Math.max(0, clockNow - miningStaminaUpdatedAt))
      : 0;

  const resetCooldownMs = Math.max(0, mineResetCooldownUntil - clockNow);
  const resetCooldownSecs = Math.ceil(resetCooldownMs / 1000);
  const canRerollFloor1 =
    mineFloor > 1 || dugCount >= MIN_TILES_DUG_TO_REROLL_SAME_FLOOR;

  const spawnTileBurst = useCallback(
    (burst: Omit<TileEffectBurst, "uid">) => {
      const uid = ++burstSeqRef.current;
      setBursts((prev) => [...prev.slice(-8), { ...burst, uid }]);
      scheduleTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.uid !== uid));
      }, 780);
    },
    [scheduleTimeout]
  );

  const handleDescendFloor = useCallback(() => {
    const nextFloor = descendMineFloor();
    if (nextFloor === null) return;
    soundEffects.playStairs();
    setFloorTransitionKey((k) => k + 1);
    setBursts([]);
    showToast(`Turun ke Lantai ${nextFloor}`, "info");
  }, [descendMineFloor, showToast]);

  const handleResetOrJump = (targetFloor: number) => {
    const now = Date.now();
    const res = resetMineToFloor(targetFloor, now);
    setClockNow(now);

    if (!res.ok) {
      if (res.reason === "same-floor-unfinished") {
        showToast(
          `Gali minimal ${MIN_TILES_DUG_TO_REROLL_SAME_FLOOR} blok (${dugCount}/${MIN_TILES_DUG_TO_REROLL_SAME_FLOOR})`,
          "warn"
        );
      } else if (res.reason === "cooldown") {
        const secs = Math.ceil((res.remainingMs ?? 0) / 1000);
        showToast(`Tunggu ${secs} detik lagi`, "warn");
      } else if (res.reason === "no-stamina") {
        soundEffects.playError();
        showToast(`Butuh minimal ${MINE_RESET_COST} stamina`, "warn");
      }
      return;
    }

    if (targetFloor > 1) {
      soundEffects.playBoing();
    } else {
      soundEffects.playClick();
    }
    setFloorTransitionKey((k) => k + 1);
    setBursts([]);
    showToast(
      targetFloor === 1
        ? `Lorong Lantai 1 baru (-${MINE_RESET_COST})`
        : `Ke Lantai ${targetFloor} (-${MINE_RESET_COST})`,
      "info"
    );
  };

  const handleDigTile = (tileId: number) => {
    const tile = mineTiles[tileId];
    if (!tile) return;

    if (tile.dug && tile.reward.kind === "ladder") {
      handleDescendFloor();
      return;
    }

    if (tile.dug) return;

    // Anti-spam swing pacing guard (prevents rapid double-tap/macro glitches)
    const now = Date.now();
    if (now - lastDigAtRef.current < MINE_DIG_COOLDOWN_MS) {
      return;
    }
    lastDigAtRef.current = now;

    const result = digMineTile(tileId, now);
    setClockNow(now);

    if (!result.ok) {
      if (result.reason === "no-stamina") {
        soundEffects.playTired();
        showToast(
          `Stamina habis! Pulih +1 ${formatCountdownSeconds(
            STAMINA_REGEN_MS - Math.max(0, now - miningStaminaUpdatedAt)
          )}`,
          "warn"
        );
      }
      return;
    }

    // Trigger sharp tile impact shake & bright hit flash
    setShakingTileId(tileId);
    setFlashTileId(tileId);
    scheduleTimeout(() => {
      setShakingTileId((curr) => (curr === tileId ? null : curr));
    }, 175);
    scheduleTimeout(() => {
      setFlashTileId((curr) => (curr === tileId ? null : curr));
    }, 90);

    if (result.outcome === "hit") {
      soundEffects.playMineHit();
      spawnTileBurst({
        tileId,
        text: `-${result.damage}`,
        textColor: "#FFFFFF",
        showPickaxe: true,
        particles: createDebrisParticles(result.tile.rock, undefined, 5),
      });
      return;
    }

    if (result.outcome === "crystal") {
      const crystal = getCrystalById(result.crystalId);
      soundEffects.playCrystalFound();

      spawnTileBurst({
        tileId,
        text: result.gotBonus
          ? `+${result.qty} BONUS!`
          : `+${result.qty} ${crystal.name.replace("Kristal ", "").toUpperCase()}`,
        textColor: crystal.accentColor,
        ringColor: crystal.accentColor,
        crystalIllustrationId: crystal.illustrationId,
        showPickaxe: true,
        particles: createDebrisParticles(result.tile.rock, crystal.accentColor, 8),
      });

      if (
        crystal.id === "emerald" ||
        crystal.id === "amethyst" ||
        result.gotBonus
      ) {
        triggerBoardShake();
      }

      setHighlightedCrystal(crystal.id);
      scheduleTimeout(() => {
        setHighlightedCrystal((curr) => (curr === crystal.id ? null : curr));
      }, 360);

      showToast(
        result.gotBonus
          ? `Bonus! +${result.qty} ${crystal.name}`
          : `+${result.qty} ${crystal.name}`,
        "success"
      );

      if (crystal.id === "emerald" || crystal.id === "amethyst" || result.gotBonus) {
        useCaregiverStore.getState().recordAction(
          "interaction",
          `Menemukan ${result.qty}× ${crystal.name} di Tambang Lantai ${mineFloor}!`,
          {}
        );
      } else {
        useCaregiverStore.getState().syncCurrentState();
      }
      return;
    }

    if (result.outcome === "ladder") {
      soundEffects.playHappy();
      triggerBoardShake();
      spawnTileBurst({
        tileId,
        text: "TANGGA!",
        textColor: "#FBBF24",
        ringColor: "#F59E0B",
        showPickaxe: true,
        particles: createDebrisParticles(result.tile.rock, "#FDE047", 7),
      });
      showToast("Tangga turun ditemukan!", "info");
      return;
    }

    // Empty rock shattered
    soundEffects.playMineHit();
    if (result.tile.rock === "deep") {
      triggerBoardShake();
    }
    spawnTileBurst({
      tileId,
      text: "",
      textColor: "#FFFFFF",
      showPickaxe: true,
      particles: createDebrisParticles(result.tile.rock, undefined, 6),
    });
  };

  const totalCrystals = CRYSTAL_CATALOG.reduce(
    (acc, c) => acc + (crystals[c.id] ?? 0),
    0
  );
  const estimatedValue = CRYSTAL_CATALOG.reduce(
    (acc, c) => acc + (crystals[c.id] ?? 0) * c.sellPrice,
    0
  );

  const getTileStyle = (tile: MineTile) => {
    if (tile.dug) {
      if (tile.reward.kind === "ladder") {
        return "bg-amber-950/90 border-amber-400 hover:bg-amber-900 cursor-pointer shadow-inner ring-2 ring-amber-400/70";
      }
      if (tile.reward.kind === "crystal") {
        return "bg-neutral-900/90 border-neutral-700/80 shadow-inner";
      }
      return "bg-neutral-900/75 dark:bg-neutral-950/90 border-neutral-800/80 shadow-inner";
    }

    switch (tile.rock) {
      case "dirt":
        return "bg-[#A16207] hover:bg-[#B45309] border-amber-950/70 shadow-[inset_0_2px_0_rgba(255,255,255,0.22),inset_0_-3px_0_rgba(0,0,0,0.3)] cursor-pointer";
      case "stone":
        return "bg-[#64748B] hover:bg-[#475569] border-slate-800/80 shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-3px_0_rgba(0,0,0,0.32)] cursor-pointer";
      case "deep":
        return "bg-[#334155] hover:bg-[#1E293B] border-slate-950/80 shadow-[inset_0_2px_0_rgba(148,163,184,0.2),inset_0_-3px_0_rgba(0,0,0,0.45)] cursor-pointer";
    }
  };

  const staminaPercent = Math.min(
    100,
    Math.max(0, Math.round((miningStamina / MAX_MINING_STAMINA) * 100))
  );

  return (
    <section className="w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Compact Overlay Header */}
      <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-3.5 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 shrink-0">
          <Pickaxe size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Tambang</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
            <Coins size={14} strokeWidth={2.2} className="text-amber-500" />
            <span>{coins}</span>
          </span>
          <Link to="/shop?tab=sell">
            <Button label="Jual" icon={Store} size="sm" variant="primary" />
          </Link>
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

      {/* Main Split Layout: 5x5 Dig Grid (Left) + Crystal Pouch & Pickaxe Info (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left: Interactive 5x5 Mine Grid */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Floor & Persisted Stamina HUD */}
          <Card shadowOffset="sm" className="p-4 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-juro-orange tabular-nums">
                Lantai {mineFloor}
              </span>

              <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                <span className="font-medium text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                  <Zap size={13} strokeWidth={2.2} className="text-amber-500" />
                  <span>
                    Stamina {miningStamina}/{MAX_MINING_STAMINA}
                  </span>
                </span>
                {miningStamina < MAX_MINING_STAMINA && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">
                    <span>·</span>
                    <Clock size={11} strokeWidth={2.2} />
                    <span>+1 ({formatCountdownSeconds(nextStaminaMs)})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Smooth Rounded Stamina Progress Bar */}
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  miningStamina <= 4 ? "bg-rose-500" : "bg-amber-400"
                }`}
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </Card>

          {/* 5x5 Digging Shaft with Micro Screen-Shake & Floor Descent Animation */}
          <Card
            shadowOffset="md"
            className="p-4 bg-[#1C1917] dark:bg-neutral-950 border-neutral-800 overflow-visible"
          >
            <div
              className={
                boardShakePhase === 1
                  ? "animate-mine-board-shake"
                  : boardShakePhase === 2
                  ? "animate-mine-board-shake-alt"
                  : ""
              }
            >
              <div
                key={`floor-${floorTransitionKey}`}
                className="animate-mine-floor grid grid-cols-5 gap-2 sm:gap-2.5 max-w-[440px] mx-auto"
              >
                {mineTiles.map((tile) => {
                  const hpRatio = tile.maxHp > 0 ? tile.hp / tile.maxHp : 0;
                  const isLightCracked = !tile.dug && tile.hp < tile.maxHp;
                  const isHeavyCracked = !tile.dug && hpRatio <= 0.45 && tile.maxHp >= 2;
                  const isShaking = shakingTileId === tile.id;
                  const isFlashing = flashTileId === tile.id;
                  const tileBursts = bursts.filter((b) => b.tileId === tile.id);

                  return (
                    <div key={tile.id} className="relative aspect-square">
                      <button
                        type="button"
                        onClick={() => handleDigTile(tile.id)}
                        className={`
                          relative w-full h-full rounded-xl border transition-colors duration-75 select-none
                          flex flex-col items-center justify-center overflow-hidden
                          ${getTileStyle(tile)}
                          ${isShaking ? "animate-mine-tile-shake" : "active:scale-95"}
                        `}
                        aria-label={
                          tile.dug
                            ? tile.reward.kind === "ladder"
                              ? "Tangga turun ke lantai berikutnya"
                              : "Blok sudah digali"
                            : `Gali blok ${tile.rock}`
                        }
                      >
                        {/* White Impact Flash Overlay */}
                        {isFlashing && (
                          <span className="absolute inset-0 bg-white/40 pointer-events-none z-10" />
                        )}

                        {/* Undug Rock Surface Details */}
                        {!tile.dug && (
                          <>
                            {tile.rock === "dirt" && (
                              <>
                                <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-200/35" />
                                <span className="absolute top-3.5 right-2.5 w-1 h-1 rounded-full bg-amber-950/45" />
                                <span className="absolute bottom-2.5 right-2.5 w-2 h-1.5 rounded-full bg-black/20" />
                              </>
                            )}
                            {tile.rock === "stone" && (
                              <>
                                <span className="absolute top-2 left-2 w-3 h-1 rounded-full bg-white/25" />
                                <span className="absolute bottom-2 right-2 w-3 h-1 rounded-full bg-black/30" />
                                <span className="absolute bottom-3 left-2.5 w-1.5 h-1.5 rounded-full bg-slate-300/25" />
                              </>
                            )}
                            {tile.rock === "deep" && (
                              <>
                                <span className="absolute inset-x-2 top-2.5 h-[2px] rounded-full bg-slate-300/20" />
                                <span className="absolute inset-x-2.5 bottom-3 h-[2px] rounded-full bg-black/40" />
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sky-300/25" />
                              </>
                            )}

                            {/* Subtle Crystal Vein Glint Hint */}
                            {tile.hasGlint && (
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-200 ring-2 ring-sky-300/50 shadow-[0_0_10px_#7DD3FC]" />
                            )}

                            {/* Progressive 2-Stage Crack Overlay */}
                            {isLightCracked && (
                              <svg
                                viewBox="0 0 24 24"
                                className="absolute inset-0 w-full h-full pointer-events-none"
                              >
                                <path
                                  d="M4 5l2 3 2 3 3 2 2 3 3 2 2 1"
                                  stroke="#171717"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                                {isHeavyCracked && (
                                  <>
                                    <path
                                      d="M19 4l-2 3-2 3-2 2-3 3-3 2-2 1"
                                      stroke="#171717"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill="none"
                                    />
                                    <path
                                      d="M11 3v4l2 3"
                                      stroke="#000000"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                      fill="none"
                                    />
                                  </>
                                )}
                              </svg>
                            )}

                            {/* HP indicator for tougher stones */}
                            {tile.maxHp > 1 && (
                              <span className="absolute bottom-1 left-1 rounded-md text-[10px] font-semibold tabular-nums text-white/95 bg-black/55 px-1.5 py-0.5 leading-none">
                                {tile.hp}
                              </span>
                            )}
                          </>
                        )}

                        {/* Revealed Ladder */}
                        {tile.dug && tile.reward.kind === "ladder" && (
                          <div className="flex flex-col items-center justify-center">
                            <ItemIllustration id="mine-ladder" size={32} />
                            <span className="rounded-full text-[10px] font-semibold text-amber-200 bg-neutral-900/90 px-2 py-0.5 border border-amber-400/70 -mt-1 shadow-xs">
                              Turun
                            </span>
                          </div>
                        )}

                        {/* Collected Crystal Marker */}
                        {tile.dug && tile.reward.kind === "crystal" && (
                          <div className="relative flex items-center justify-center">
                            <div className="opacity-30 scale-85">
                              <ItemIllustration
                                id={getCrystalById(tile.reward.crystalId).illustrationId}
                                size={26}
                              />
                            </div>
                            <span className="absolute inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-xs">
                              <Check size={11} strokeWidth={2.8} />
                            </span>
                          </div>
                        )}
                      </button>

                      {/* Tile VFX Layer: Animated Pickaxe Chop, Rising Crystal, Flying Debris, Shockwave Ring & Floating Loot Text */}
                      {tileBursts.map((burst) => (
                        <div
                          key={burst.uid}
                          className="absolute inset-0 pointer-events-none z-30 overflow-visible"
                        >
                          {burst.ringColor && (
                            <span
                              className="animate-mine-ring absolute inset-1 rounded-xl border-2"
                              style={{ borderColor: burst.ringColor }}
                            />
                          )}

                          {burst.crystalIllustrationId && (
                            <div className="animate-mine-crystal-pop absolute top-1/2 left-1/2 drop-shadow-md">
                              <ItemIllustration
                                id={burst.crystalIllustrationId}
                                size={32}
                              />
                            </div>
                          )}

                          {burst.showPickaxe && (
                            <div className="animate-mine-pickaxe absolute top-1/2 left-1/2 origin-bottom-left">
                              <ItemIllustration id={activePickaxe.illustrationId} size={34} />
                            </div>
                          )}

                          {burst.particles.map((pt, pIdx) => (
                            <span
                              key={pIdx}
                              className="animate-mine-debris absolute top-1/2 left-1/2 rounded-xs"
                              style={
                                {
                                  width: pt.size,
                                  height: pt.size,
                                  backgroundColor: pt.color,
                                  marginLeft: -pt.size / 2,
                                  marginTop: -pt.size / 2,
                                  "--dx": `${pt.dx}px`,
                                  "--dy": `${pt.dy}px`,
                                } as React.CSSProperties
                              }
                            />
                          ))}

                          {burst.text && (
                            <span
                              className="animate-mine-float absolute top-0 left-1/2 whitespace-nowrap rounded-full text-[11px] font-semibold px-2 py-0.5 bg-neutral-900/95 border border-white/15 shadow-md"
                              style={{ color: burst.textColor }}
                            >
                              {burst.text}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls inside Mine Box */}
            <div className="mt-4 pt-3.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs text-neutral-400 tabular-nums">
                {activePickaxe.name} (Daya {activePickaxe.power}) · Digali {dugCount}/25
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {deepestFloor > mineFloor && (
                  <Button
                    label={
                      resetCooldownSecs > 0
                        ? `Ke Lt.${deepestFloor} (${resetCooldownSecs}d)`
                        : `Ke Lt.${deepestFloor} (-${MINE_RESET_COST})`
                    }
                    icon={Layers}
                    size="sm"
                    variant="accent"
                    disabled={resetCooldownSecs > 0 || miningStamina < MINE_RESET_COST}
                    onClick={() => handleResetOrJump(deepestFloor)}
                  />
                )}
                {ladderRevealed && (
                  <Button
                    label={`Turun Lt.${mineFloor + 1}`}
                    icon={ArrowDown}
                    size="sm"
                    variant="primary"
                    onClick={handleDescendFloor}
                  />
                )}
                <Button
                  label={
                    resetCooldownSecs > 0
                      ? `Reset Lt.1 (${resetCooldownSecs}d)`
                      : `Reset Lt.1 (-${MINE_RESET_COST})`
                  }
                  icon={RotateCcw}
                  size="sm"
                  variant="secondary"
                  disabled={
                    !canRerollFloor1 ||
                    resetCooldownSecs > 0 ||
                    miningStamina < MINE_RESET_COST
                  }
                  onClick={() => handleResetOrJump(1)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Crystal Pouch & Mining Equipment Summary */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Crystal Pouch Card */}
          <Card shadowOffset="sm" className="p-4 shadow-none space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Gem size={15} strokeWidth={2.2} className="text-sky-500" />
                <span>Kantong Kristal ({totalCrystals})</span>
              </h2>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ~{estimatedValue} Koin
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {CRYSTAL_CATALOG.map((c) => {
                const count = crystals[c.id] ?? 0;
                const locked = mineFloor < c.minFloor && count === 0;
                const isPopping = highlightedCrystal === c.id;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border bg-neutral-50/80 dark:bg-neutral-800/60 flex items-center gap-2.5 transition-all ${
                      isPopping
                        ? "animate-mine-pouch border-juro-orange ring-1 ring-juro-orange/25"
                        : "border-neutral-200/80 dark:border-neutral-700/70"
                    } ${locked ? "opacity-55" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/70 flex items-center justify-center shrink-0">
                      <ItemIllustration id={c.illustrationId} size={28} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-800 dark:text-white truncate">
                        {c.name.replace("Kristal ", "")}
                      </p>
                      <p className="text-sm font-bold text-juro-orange tabular-nums leading-tight mt-0.5">
                        ×{count}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {c.sellPrice} koin · Lt.{c.minFloor}+
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Link to="/shop?tab=sell" className="block">
                <Button
                  label={
                    estimatedValue > 0
                      ? `Jual Kristal di Toko (+${estimatedValue} Koin)`
                      : "Buka Pasar Kristal di Toko"
                  }
                  icon={Store}
                  size="sm"
                  variant="primary"
                  className="w-full min-h-[40px]"
                />
              </Link>
            </div>
          </Card>

          {/* Compact Active Pickaxe Row */}
          <Card variant="warm" shadowOffset="sm" className="p-4 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center shrink-0">
                  <ItemIllustration id={activePickaxe.illustrationId} size={32} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {activePickaxe.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-juro-orange tabular-nums shrink-0">
                      · Lv.{activePickaxe.level}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums">
                    Daya {activePickaxe.power} · +{Math.round(activePickaxe.bonusChance * 100)}% Bonus
                  </p>
                </div>
              </div>

              <Link
                to="/shop?tab=tools"
                className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-juro-orange hover:underline"
              >
                <span>Upgrade</span>
                <ChevronRight size={14} strokeWidth={2.2} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
