import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

interface CriticalNeeds {
  hunger: number;
  energy: number;
  cleanliness: number;
}

const STORAGE_KEY_ENABLED = "juro_notifications_enabled";
const STORAGE_KEY_LAST_CRITICAL = "juro_last_critical_notifications";
const CRITICAL_COOLDOWN_MS = 45 * 60 * 1000; // 45 menit cooldown agar tidak spam

class NotificationService {
  private lastCriticalTimes: Record<string, number> = {};

  constructor() {
    this.loadLastCriticalTimes();
  }

  private loadLastCriticalTimes() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY_LAST_CRITICAL);
        if (saved) {
          this.lastCriticalTimes = JSON.parse(saved);
        }
      }
    } catch {
      this.lastCriticalTimes = {};
    }
  }

  private saveLastCriticalTimes() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(
          STORAGE_KEY_LAST_CRITICAL,
          JSON.stringify(this.lastCriticalTimes)
        );
      }
    } catch {
      // Abaikan jika storage penuh
    }
  }

  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    if (typeof window !== "undefined" && "Notification" in window) return true;
    return false;
  }

  isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    const pref = localStorage.getItem(STORAGE_KEY_ENABLED);
    return pref === "true";
  }

  setEnabled(enabled: boolean) {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? "true" : "false");
    }
  }

  async hasPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await LocalNotifications.checkPermissions();
        return check.display === "granted";
      } catch {
        return false;
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }

    return false;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === "granted";
        if (granted) this.setEnabled(true);
        return granted;
      } catch (err) {
        console.warn("Gagal meminta izin notifikasi native:", err);
        return false;
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        const granted = perm === "granted";
        if (granted) this.setEnabled(true);
        return granted;
      } catch (err) {
        console.warn("Gagal meminta izin notifikasi browser:", err);
        return false;
      }
    }

    return false;
  }

  async sendNotification(title: string, body: string, id = Math.floor(Math.random() * 100000)) {
    if (!this.isEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await this.hasPermission();
        if (!hasPerm) return;

        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              smallIcon: "ic_stat_name",
              sound: undefined,
            },
          ],
        });
      } catch (err) {
        console.warn("Gagal memunculkan notifikasi native:", err);
      }
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
          });
        } catch (err) {
          console.warn("Gagal memunculkan notifikasi web:", err);
        }
      }
    }
  }

  async notifyPartnerAction(partnerName: string, actionDescription: string) {
    if (!this.isEnabled()) return;

    // Munculkan notifikasi jika tab sedang di latar belakang atau jika di native app
    const isBackground = typeof document !== "undefined" ? document.hidden : true;
    if (Capacitor.isNativePlatform() || isBackground) {
      await this.sendNotification(
        `${partnerName} merawat Juro`,
        actionDescription,
        Math.floor(Date.now() % 100000)
      );
    }
  }

  async checkCriticalNeeds(needs: CriticalNeeds) {
    if (!this.isEnabled()) return;

    const now = Date.now();
    const isBackground = typeof document !== "undefined" ? document.hidden : true;

    // Hanya notifikasi jika tab sedang di latar belakang atau di native app
    if (!Capacitor.isNativePlatform() && !isBackground) return;

    // Cek rasa lapar
    if (needs.hunger <= 25) {
      const lastHunger = this.lastCriticalTimes.hunger || 0;
      if (now - lastHunger > CRITICAL_COOLDOWN_MS) {
        this.lastCriticalTimes.hunger = now;
        this.saveLastCriticalTimes();
        await this.sendNotification(
          "Juro Sedang Kelaparan!",
          "Perut Juro keroncongan. Yuk berikan camilan atau buah segar!",
          101
        );
        return;
      }
    }

    // Cek energi
    if (needs.energy <= 20) {
      const lastEnergy = this.lastCriticalTimes.energy || 0;
      if (now - lastEnergy > CRITICAL_COOLDOWN_MS) {
        this.lastCriticalTimes.energy = now;
        this.saveLastCriticalTimes();
        await this.sendNotification(
          "Juro Sangat Mengantuk!",
          "Energi Juro hampir habis. Waktunya taruh Juro di tempat tidur.",
          102
        );
        return;
      }
    }

    // Cek kebersihan
    if (needs.cleanliness <= 20) {
      const lastClean = this.lastCriticalTimes.cleanliness || 0;
      if (now - lastClean > CRITICAL_COOLDOWN_MS) {
        this.lastCriticalTimes.cleanliness = now;
        this.saveLastCriticalTimes();
        await this.sendNotification(
          "Juro Butuh Mandi Segar!",
          "Tubuh Juro mulai kotor. Sabuni dan bilas dengan ember air yuk!",
          103
        );
      }
    }
  }

  async sendTestNotification(): Promise<boolean> {
    const hasPerm = await this.hasPermission();
    if (!hasPerm) {
      const requested = await this.requestPermission();
      if (!requested) return false;
    }

    this.setEnabled(true);
    await this.sendNotification(
      "Notifikasi Juro Aktif",
      "Kamu dan pasanganmu akan menerima pengingat saat Juro butuh dirawat!",
      999
    );
    return true;
  }
}

export const notificationService = new NotificationService();
