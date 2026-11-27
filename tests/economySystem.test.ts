import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../src/stores/gameStore";
import { usePetStore } from "../src/stores/petStore";
import {
  DEFAULT_CRYSTALS,
  DEFAULT_FOOD_INVENTORY,
  DEFAULT_OWNED_TOYS,
  DEFAULT_UNLOCKED_SKINS,
} from "../src/data/economyCatalog";
import {
  BASE_GROUND_Y,
  getTerrainHeightAt,
  resolveHorizontalCollisions,
} from "../src/engine/world/mapTerrain";
import {
  MAX_MINING_STAMINA,
  MINE_RESET_COOLDOWN_MS,
  MINE_RESET_COST,
  STAMINA_REGEN_MS,
  generateMineFloor,
  type MineTile,
} from "../src/engine/mining/mineGenerator";

describe("Economy, Mining & Shop System", () => {
  beforeEach(() => {
    useGameStore.setState({
      coins: 50,
      logs: [],
      crystals: { ...DEFAULT_CRYSTALS },
      foodInventory: { ...DEFAULT_FOOD_INVENTORY },
      ownedToys: [...DEFAULT_OWNED_TOYS],
      unlockedSkins: [...DEFAULT_UNLOCKED_SKINS],
      activeSkin: "classic-orange",
      pickaxeLevel: 1,
      deepestFloor: 1,
      miningStamina: MAX_MINING_STAMINA,
      miningStaminaUpdatedAt: 1_000_000,
      mineFloor: 1,
      mineTiles: generateMineFloor(1),
      mineResetCooldownUntil: 0,
    });
  });

  it("collects mined crystals and sells them for coins", () => {
    const store = useGameStore.getState();
    store.addCrystal("quartz", 3); // 3 * 10 = 30
    store.addCrystal("emerald", 1); // 1 * 52 = 52

    const earnedSingle = useGameStore.getState().sellCrystal("quartz", 2);
    expect(earnedSingle).toBe(20);
    expect(useGameStore.getState().coins).toBe(70);
    expect(useGameStore.getState().crystals.quartz).toBe(1);

    const earnedAll = useGameStore.getState().sellAllCrystals();
    expect(earnedAll).toBe(62); // 10 + 52
    expect(useGameStore.getState().coins).toBe(132);
    expect(useGameStore.getState().crystals.quartz).toBe(0);
    expect(useGameStore.getState().crystals.emerald).toBe(0);
  });

  it("buys consumable food stock and decrements stock when feeding Juro", () => {
    // Biscuit costs 28 coins; setting coins = 70 gives enough to buy 2 (costs 56, leaves 14)
    useGameStore.setState({ coins: 70 });
    const bought = useGameStore.getState().buyFood("biscuit", 2);
    expect(bought).toBe(true);
    expect(useGameStore.getState().coins).toBe(14);
    expect(useGameStore.getState().foodInventory.biscuit).toBe(2);

    // Cannot buy more when coins are insufficient (14 < 28)
    expect(useGameStore.getState().buyFood("biscuit", 1)).toBe(false);

    // Consuming food decrements stock until empty
    expect(useGameStore.getState().consumeFood("biscuit")).toBe(true);
    expect(useGameStore.getState().foodInventory.biscuit).toBe(1);
    expect(useGameStore.getState().consumeFood("biscuit")).toBe(true);
    expect(useGameStore.getState().foodInventory.biscuit).toBe(0);
    expect(useGameStore.getState().consumeFood("biscuit")).toBe(false);
  });

  it("purchases permanent toys only once", () => {
    useGameStore.setState({ coins: 200 });

    // Bubble blower costs 130 coins
    expect(useGameStore.getState().buyToy("bubble-blower")).toBe(true);
    expect(useGameStore.getState().coins).toBe(70);
    expect(useGameStore.getState().ownedToys).toContain("bubble-blower");

    // Purchasing again does nothing and costs 0
    expect(useGameStore.getState().buyToy("bubble-blower")).toBe(false);
    expect(useGameStore.getState().coins).toBe(70);
  });

  it("upgrades pickaxe sequentially when player has enough coins", () => {
    // Lv.2 costs 120 coins; starting with 50 should fail
    expect(useGameStore.getState().upgradePickaxe()).toBe(false);
    expect(useGameStore.getState().pickaxeLevel).toBe(1);

    useGameStore.setState({ coins: 400 });
    // Lv.2 costs 120 coins
    expect(useGameStore.getState().upgradePickaxe()).toBe(true);
    expect(useGameStore.getState().pickaxeLevel).toBe(2);
    expect(useGameStore.getState().coins).toBe(280);

    // Lv.3 costs 260 coins
    expect(useGameStore.getState().upgradePickaxe()).toBe(true);
    expect(useGameStore.getState().pickaxeLevel).toBe(3);
    expect(useGameStore.getState().coins).toBe(20);
  });

  it("unlocks and equips collection skins persistently using mined crystals without charging coins", () => {
    useGameStore.setState({
      coins: 50,
      crystals: { ...DEFAULT_CRYSTALS, emerald: 3 },
    });

    // Cannot equip a locked skin
    expect(useGameStore.getState().equipSkin("mint-lime")).toBe(false);
    expect(useGameStore.getState().activeSkin).toBe("classic-orange");

    // Cannot unlock sky-cyan without 2 amethyst
    expect(useGameStore.getState().unlockSkin("sky-cyan")).toBe(false);
    expect(useGameStore.getState().coins).toBe(50);

    // Unlock mint-lime (2 emerald) -> deducts emerald, keeps coins untouched
    expect(useGameStore.getState().unlockSkin("mint-lime")).toBe(true);
    expect(useGameStore.getState().coins).toBe(50);
    expect(useGameStore.getState().crystals.emerald).toBe(1);
    expect(useGameStore.getState().unlockedSkins).toContain("mint-lime");
    expect(useGameStore.getState().activeSkin).toBe("mint-lime");

    // Re-unlocking does not deduct crystals again
    expect(useGameStore.getState().unlockSkin("mint-lime")).toBe(false);
    expect(useGameStore.getState().crystals.emerald).toBe(1);

    // Switching back and forth works freely
    expect(useGameStore.getState().equipSkin("classic-orange")).toBe(true);
    expect(useGameStore.getState().equipSkin("mint-lime")).toBe(true);
  });

  it("guards pet attributes against negative clock skew in recalculateFromTimestamp", () => {
    usePetStore.setState({
      hunger: 80,
      energy: 70,
      happiness: 90,
      cleanliness: 85,
      lastUpdated: Date.now() + 1000 * 60 * 60 * 5, // 5 hours in the future
    });

    usePetStore.getState().recalculateFromTimestamp();
    const state = usePetStore.getState();
    expect(state.hunger).toBe(80);
    expect(state.energy).toBe(70);
    expect(state.happiness).toBe(90);
    expect(state.cleanliness).toBe(85);
  });

  it("resolves solid map obstacles and elevated platform cliff walls accurately", () => {
    // Trying to walk straight into the bridge-side lantern at (-7.1, -1.7) pushes Juro outside
    const hitLantern = resolveHorizontalCollisions(-7.1, -1.7, BASE_GROUND_Y, 0.4, false);
    expect(hitLantern.hitObstacle).toBe(true);
    expect(Math.hypot(hitLantern.x - -7.1, hitLantern.z - -1.7)).toBeGreaterThanOrEqual(0.55);

    // Trying to walk into WARUNG building at (18.8, -3.2) blocks entry
    const hitShop = resolveHorizontalCollisions(18.8, -3.2, BASE_GROUND_Y, 0.4, false);
    expect(hitShop.hitObstacle).toBe(true);

    // When atop Bukit Santai, terrain height matches hill elevation
    expect(getTerrainHeightAt(-15.0, 4.0)).toBeGreaterThanOrEqual(2.0);

    // Mine Cave at (-14.2, -14.2) blocks Juro from clipping inside
    const hitMineCave = resolveHorizontalCollisions(-14.2, -14.2, BASE_GROUND_Y, 0.38, false);
    expect(hitMineCave.hitObstacle).toBe(true);
  });

  it("prevents crystal spam, duplicate tile collection, and free stamina refills on reset or descend", () => {
    const startNow = 2_000_000;
    const controlledBoard: MineTile[] = Array.from({ length: 25 }, (_, id) => ({
      id,
      rock: "dirt",
      hp: 1,
      maxHp: 1,
      dug: false,
      reward:
        id === 0
          ? { kind: "crystal", crystalId: "quartz" }
          : id === 1
            ? { kind: "ladder" }
            : { kind: "empty" },
      hasGlint: false,
      collected: false,
    }));

    useGameStore.setState({
      miningStamina: 5,
      miningStaminaUpdatedAt: startNow,
      mineFloor: 1,
      deepestFloor: 2,
      mineTiles: controlledBoard,
      mineResetCooldownUntil: 0,
      crystals: { ...DEFAULT_CRYSTALS },
    });

    // Cannot descend before uncovering ladder
    expect(useGameStore.getState().descendMineFloor()).toBeNull();

    // Dig crystal tile 0 once -> grants crystal & consumes 1 stamina
    const firstDig = useGameStore.getState().digMineTile(0, startNow);
    expect(firstDig.ok).toBe(true);
    expect(useGameStore.getState().miningStamina).toBe(4);
    expect(useGameStore.getState().crystals.quartz).toBeGreaterThanOrEqual(1);
    const quartzAfterFirst = useGameStore.getState().crystals.quartz;

    // Re-digging same tile cannot duplicate crystal or consume stamina
    const dupDig = useGameStore.getState().digMineTile(0, startNow + 100);
    expect(dupDig).toEqual({ ok: false, reason: "already-dug" });
    expect(useGameStore.getState().crystals.quartz).toBe(quartzAfterFirst);
    expect(useGameStore.getState().miningStamina).toBe(4);

    // Cannot reroll Floor 1 before exploring >= 15 blocks
    const earlyReset = useGameStore.getState().resetMineToFloor(1, startNow + 200);
    expect(earlyReset).toEqual({ ok: false, reason: "same-floor-unfinished" });
    expect(useGameStore.getState().miningStamina).toBe(4);

    // Jumping to Floor 2 costs MINE_RESET_COST stamina (never refills!) and sets 30s cooldown
    const jumpRes = useGameStore.getState().resetMineToFloor(2, startNow + 300);
    expect(jumpRes).toEqual({ ok: true, floor: 2 });
    expect(useGameStore.getState().miningStamina).toBe(4 - MINE_RESET_COST);
    expect(useGameStore.getState().mineFloor).toBe(2);

    // Immediate reset spam back to Floor 1 is blocked by cooldown
    const spamReset = useGameStore.getState().resetMineToFloor(1, startNow + 1000);
    expect(spamReset.ok).toBe(false);
    if (!spamReset.ok) {
      expect(spamReset.reason).toBe("cooldown");
    }

    // Even after cooldown expires, insufficient stamina blocks reset (1 < 3)
    const lowStaminaReset = useGameStore
      .getState()
      .resetMineToFloor(1, startNow + 300 + MINE_RESET_COOLDOWN_MS + 100);
    // Note: 30s elapsed > 25s regen -> +1 stamina regenerated -> 2 stamina, still < 3
    expect(useGameStore.getState().miningStamina).toBe(2);
    expect(lowStaminaReset.ok).toBe(false);
    if (!lowStaminaReset.ok) {
      expect(lowStaminaReset.reason).toBe("no-stamina");
    }

    // Digging remaining 2 stamina drops stamina to 0 and blocks further digging
    useGameStore.setState({ mineTiles: controlledBoard, miningStamina: 1, miningStaminaUpdatedAt: startNow });
    const ladderDig = useGameStore.getState().digMineTile(1, startNow + 100);
    expect(ladderDig.ok).toBe(true);
    expect(useGameStore.getState().miningStamina).toBe(0);

    const noStaminaDig = useGameStore.getState().digMineTile(2, startNow + 200);
    expect(noStaminaDig).toEqual({ ok: false, reason: "no-stamina" });

    // Descending via uncovered ladder works, and does NOT grant free stamina
    const nextFloor = useGameStore.getState().descendMineFloor();
    expect(nextFloor).toBe(3);
    expect(useGameStore.getState().miningStamina).toBe(0);

    // Time-based regen restores +2 stamina after 2 * STAMINA_REGEN_MS
    useGameStore.getState().syncMiningStamina(startNow + STAMINA_REGEN_MS * 2 + 500);
    expect(useGameStore.getState().miningStamina).toBe(2);
  });

  it("unlocks and equips wearable hats correctly in accessory system", () => {
    // Initial state: hat-none unlocked and active
    expect(useGameStore.getState().unlockedHats).toContain("hat-none");
    expect(useGameStore.getState().activeHat).toBe("hat-none");

    // Topi Baling costs 220 coins; initial coins = 50 -> unlock fails
    expect(useGameStore.getState().unlockHat("hat-propeller")).toBe(false);
    expect(useGameStore.getState().coins).toBe(50);
    expect(useGameStore.getState().unlockedHats).not.toContain("hat-propeller");

    // Cannot equip locked hat
    expect(useGameStore.getState().equipHat("hat-propeller")).toBe(false);
    expect(useGameStore.getState().activeHat).toBe("hat-none");

    // Add coins and unlock Topi Baling
    useGameStore.setState({ coins: 300 });
    expect(useGameStore.getState().unlockHat("hat-propeller")).toBe(true);
    expect(useGameStore.getState().coins).toBe(80); // 300 - 220 = 80
    expect(useGameStore.getState().unlockedHats).toContain("hat-propeller");
    expect(useGameStore.getState().activeHat).toBe("hat-propeller");

    // Cannot buy already unlocked hat again
    expect(useGameStore.getState().unlockHat("hat-propeller")).toBe(false);
    expect(useGameStore.getState().coins).toBe(80);

    // Unequip hat back to hat-none
    expect(useGameStore.getState().equipHat("hat-none")).toBe(true);
    expect(useGameStore.getState().activeHat).toBe("hat-none");

    // Re-equip Topi Baling
    expect(useGameStore.getState().equipHat("hat-propeller")).toBe(true);
    expect(useGameStore.getState().activeHat).toBe("hat-propeller");
  });
});
