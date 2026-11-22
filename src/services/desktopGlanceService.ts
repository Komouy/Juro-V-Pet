import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Desktop & Mobile Pet Glance Service
 * Mengelola Document Picture-in-Picture (PiP) di desktop,
 * Native Picture-in-Picture (PiP) di Android,
 * serta sinkronisasi state widget layar utama Android.
 */

interface JuroGlanceNativePlugin {
  enterPip(): Promise<{ success: boolean }>;
  isPipSupported(): Promise<{ supported: boolean }>;
  updateWidgetState(options: {
    name: string;
    status: string;
    hunger: number;
    energy: number;
  }): Promise<{ success: boolean }>;
}

const JuroGlanceNative = registerPlugin<JuroGlanceNativePlugin>("JuroGlanceNative");

type Listener = () => void;

class DesktopGlanceService {
  private pipWindow: Window | null = null;
  private pipContainer: HTMLElement | null = null;
  private isDockOpen = false;
  private isNativePip = false;
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("juroPipModeChanged", (e: Event) => {
        const customEvent = e as CustomEvent<{ isPip: boolean }>;
        this.isNativePip = Boolean(customEvent.detail?.isPip);
        this.notify();
      });
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public isDocumentPipSupported(): boolean {
    return typeof window !== "undefined" && "documentPictureInPicture" in window;
  }

  public isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  }

  public isPipActive(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed;
  }

  public isNativePipActive(): boolean {
    return this.isNativePip;
  }

  public isGlanceDockOpen(): boolean {
    return this.isDockOpen;
  }

  public getPipContainer(): HTMLElement | null {
    return this.pipContainer;
  }

  public async enterNativePip(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await JuroGlanceNative.enterPip();
      if (res && res.success) {
        this.isNativePip = true;
        this.notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async updateAndroidWidget(
    name: string,
    status: string,
    hunger: number,
    energy: number
  ): Promise<void> {
    if (!this.isNativeAndroid()) return;
    try {
      await JuroGlanceNative.updateWidgetState({
        name,
        status,
        hunger,
        energy,
      });
    } catch {
      // Abaikan jika widget native belum dipasang
    }
  }

  public async openDesktopPip(): Promise<boolean> {
    // 1. Coba Native PiP jika berjalan di aplikasi Android
    if (this.isNativeAndroid()) {
      const nativeOk = await this.enterNativePip();
      if (nativeOk) return true;
    }

    // 2. Coba Document Picture-in-Picture di Desktop Browser
    if (!this.isDocumentPipSupported()) {
      // Fallback: Tampilkan In-Tab Floating Dock
      this.isDockOpen = true;
      this.notify();
      return false;
    }

    try {
      if (this.isPipActive()) {
        this.pipWindow?.focus();
        return true;
      }

      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 340,
        height: 500,
      });

      this.pipWindow = pip;
      this.pipContainer = pip.document.body;

      // Salin stylesheet aktif agar Tailwind dan font pixel tampil presisi
      const styleElements = document.querySelectorAll("link[rel='stylesheet'], style");
      styleElements.forEach((el) => {
        pip.document.head.appendChild(el.cloneNode(true));
      });

      pip.document.title = "Juro Pet Glance";
      pip.document.body.style.margin = "0";
      pip.document.body.style.padding = "0";
      pip.document.body.style.overflow = "hidden";
      pip.document.body.style.backgroundColor = "#FDFBF7";

      pip.addEventListener("pagehide", () => {
        this.pipWindow = null;
        this.pipContainer = null;
        this.notify();
      });

      this.notify();
      return true;
    } catch {
      // Fallback ke in-tab floating dock jika izin ditolak
      this.isDockOpen = true;
      this.notify();
      return false;
    }
  }

  public closeDesktopPip(): void {
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.pipWindow = null;
    this.pipContainer = null;
    this.notify();
  }

  public toggleDock(open?: boolean): void {
    this.isDockOpen = open !== undefined ? open : !this.isDockOpen;
    this.notify();
  }

  public focusMainWindow(): void {
    if (typeof window !== "undefined") {
      window.focus();
    }
  }
}

export const desktopGlanceService = new DesktopGlanceService();
