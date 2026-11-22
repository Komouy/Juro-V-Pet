/**
 * Desktop Pet Glance Service
 * Manages Document Picture-in-Picture (PiP) window for always-on-top desktop companion
 * and provides fallback state management for in-tab floating companion dock.
 */

type Listener = () => void;

class DesktopGlanceService {
  private pipWindow: Window | null = null;
  private pipContainer: HTMLElement | null = null;
  private isDockOpen = false;
  private listeners: Set<Listener> = new Set();

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

  public isPipActive(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed;
  }

  public isGlanceDockOpen(): boolean {
    return this.isDockOpen;
  }

  public getPipContainer(): HTMLElement | null {
    return this.pipContainer;
  }

  public async openDesktopPip(): Promise<boolean> {
    if (!this.isDocumentPipSupported()) {
      // Fallback: Open in-tab floating dock
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

      // Copy all active stylesheets so Tailwind and pixel fonts render identically
      const styleElements = document.querySelectorAll("link[rel='stylesheet'], style");
      styleElements.forEach((el) => {
        pip.document.head.appendChild(el.cloneNode(true));
      });

      // Set clean background and title
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
      // Fallback to in-tab floating dock on permission denial or error
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
