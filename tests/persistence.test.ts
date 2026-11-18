// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore } from "../src/stores/petStore";
import { useGameStore } from "../src/stores/gameStore";
import { persistenceService } from "../src/services/persistenceService";

describe("PersistenceService", () => {
  beforeEach(() => {
    usePetStore.setState({
      name: "Juro",
      level: 3,
      xp: 75,
      xpToNextLevel: 300,
      hunger: 65,
      energy: 80,
      happiness: 92,
      cleanliness: 70,
      affection: 88,
      lastUpdated: 1700000000000,
    });

    useGameStore.setState({
      coins: 150,
      logs: [
        {
          id: "log-test-1",
          type: "feed",
          message: "Uji coba makan",
          timestamp: 1700000000000,
        },
      ],
    });
  });

  it("exports save file payload matching expected schema", async () => {
    const jsonString = await persistenceService.exportSaveFile();
    expect(jsonString).toBeDefined();

    const parsed = JSON.parse(jsonString);
    expect(parsed.version).toBe(1);
    expect(parsed.pet).toBeDefined();
    expect(parsed.pet.name).toBe("Juro");
    expect(parsed.pet.level).toBe(3);
    expect(parsed.game.coins).toBe(150);
  });

  it("imports valid save file and updates store state", async () => {
    const backupPayload = {
      version: 1,
      exportedAt: Date.now(),
      pet: {
        id: "current",
        name: "JuroSuper",
        level: 5,
        xp: 150,
        xpToNextLevel: 500,
        hunger: 95,
        energy: 90,
        happiness: 100,
        cleanliness: 90,
        affection: 95,
        lastUpdated: Date.now(),
      },
      game: {
        id: "current",
        coins: 300,
        logs: [],
        unlockedCases: ["classic-orange"],
      },
      preferences: {
        id: "current",
        theme: "dark",
        soundEnabled: false,
      },
    };

    const success = await persistenceService.importSaveFile(JSON.stringify(backupPayload));
    expect(success).toBe(true);

    expect(usePetStore.getState().name).toBe("JuroSuper");
    expect(usePetStore.getState().level).toBe(5);
    expect(useGameStore.getState().coins).toBe(300);
  });

  it("rejects invalid JSON string gracefully", async () => {
    const success = await persistenceService.importSaveFile("invalid-non-json");
    expect(success).toBe(false);
  });

  it("sanitizes corrupted numeric fields in backup JSON without injecting NaN", async () => {
    const partialBackup = {
      version: 1,
      pet: { name: "   ", level: -5, xp: "bad", hunger: 999, energy: -50 },
      game: {
        coins: -100,
        pickaxeLevel: 99,
        crystals: { quartz: -20, amber: "bad", unknown: 999 },
        foodInventory: { "honey-drop": -5, invalid: 10 },
        ownedToys: ["fake-toy"],
        unlockedCases: ["fake-skin"],
      },
      preferences: { theme: "neon-invalid", soundEnabled: "yes" },
    };
    const success = await persistenceService.importSaveFile(JSON.stringify(partialBackup));
    expect(success).toBe(true);

    const pet = usePetStore.getState();
    const game = useGameStore.getState();
    expect(pet.name).toBe("Juro");
    expect(pet.level).toBe(1);
    expect(Number.isFinite(pet.xp)).toBe(true);
    expect(pet.hunger).toBe(100);
    expect(pet.energy).toBe(0);
    expect(game.coins).toBe(0);
    expect(game.pickaxeLevel).toBe(5);
    expect(game.crystals.quartz).toBe(0);
    expect(game.crystals.amber).toBe(0);
    expect(game.foodInventory["honey-drop"]).toBe(0);
    expect(game.ownedToys).not.toContain("fake-toy");
    expect(game.unlockedSkins).not.toContain("fake-skin");
    expect(game.mineTiles).toHaveLength(25);
  });

  it("persists mining stamina and active mine floor across export and import", async () => {
    const board = useGameStore.getState().mineTiles.map((t, i) =>
      i === 0 ? { ...t, dug: true, hp: 0 } : t
    );
    useGameStore.setState({
      miningStamina: 7,
      mineFloor: 2,
      deepestFloor: 3,
      mineTiles: board,
    });

    const exported = await persistenceService.exportSaveFile();
    useGameStore.setState({ miningStamina: 20, mineFloor: 1 });

    const imported = await persistenceService.importSaveFile(exported);
    expect(imported).toBe(true);
    expect(useGameStore.getState().miningStamina).toBe(7);
    expect(useGameStore.getState().mineFloor).toBe(2);
    expect(useGameStore.getState().mineTiles[0].dug).toBe(true);
  });
});
