// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { desktopGlanceService } from "../src/services/desktopGlanceService";
import { usePetStore } from "../src/stores/petStore";
import { useGameStore } from "../src/stores/gameStore";
import { useCaregiverStore } from "../src/stores/caregiverStore";
import { getSkinById, getHatById } from "../src/data/economyCatalog";

describe("Pet Glance & Desktop Companion System", () => {
  beforeEach(() => {
    usePetStore.setState({
      name: "Juro",
      level: 4,
      hunger: 80,
      energy: 90,
      cleanliness: 85,
      happiness: 95,
      affection: 88,
      currentState: "idle",
    });

    useGameStore.setState({
      activeSkin: "classic-orange",
      activeHat: "hat-straw",
    });

    useCaregiverStore.setState({
      activeRoomCode: null,
      partnerPet: null,
    });
  });

  it("provides desktop glance service with toggle dock fallback", () => {
    let notified = 0;
    const unsub = desktopGlanceService.subscribe(() => {
      notified += 1;
    });

    expect(desktopGlanceService.isGlanceDockOpen()).toBe(false);

    desktopGlanceService.toggleDock(true);
    expect(desktopGlanceService.isGlanceDockOpen()).toBe(true);
    expect(notified).toBe(1);

    desktopGlanceService.toggleDock(false);
    expect(desktopGlanceService.isGlanceDockOpen()).toBe(false);
    expect(notified).toBe(2);

    unsub();
  });

  it("loads 2D avatar configuration matching active skin and hat", () => {
    const skin = getSkinById(useGameStore.getState().activeSkin);
    expect(skin.name).toBe("Classic Juro");
    expect(skin.colorA).toBe("#F97316");

    const hat = getHatById(useGameStore.getState().activeHat);
    expect(hat.name).toBe("Topi Jerami");
  });

  it("handles offline guest partner pet status in 2-Player glance mode", () => {
    useCaregiverStore.setState({
      activeRoomCode: "JURO-8888",
      partnerPet: {
        ownerCaregiverId: "cg-2",
        ownerName: "Sahabat",
        name: "Juro Mint",
        level: 7,
        hunger: 85,
        energy: 80,
        cleanliness: 90,
        happiness: 85,
        affection: 88,
        currentState: "sleep",
        activeSkin: "mint-lime",
        activeHat: "hat-chef",
        isOnline: false,
        lastUpdated: Date.now(),
      },
    });

    const partner = useCaregiverStore.getState().partnerPet;
    expect(partner?.name).toBe("Juro Mint");
    expect(partner?.isOnline).toBe(false);
    expect(partner?.currentState).toBe("sleep");
  });

  it("correctly focuses main window when requested", () => {
    const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});
    desktopGlanceService.focusMainWindow();
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
