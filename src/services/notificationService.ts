import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface CriticalNeeds {
  hunger: number;
  energy: number;
  cleanliness: number;
}

export const NOTIF_CHANNEL_ID = "juro_care_channel";
export const NOTIF_ID_HUNGER = 101;
export const NOTIF_ID_BEDTIME = 102;
export const NOTIF_ID_CLEANLINESS = 103;
export const NOTIF_ID_GREETING = 104;

export interface BackgroundNotificationPlan {
  id: number;
  title: string;
  body: string;
  triggerAt: Date;
  channelId: string;
}

const STORAGE_KEY_ENABLED = "juro_notifications_enabled";
const STORAGE_KEY_LAST_CRITICAL = "juro_last_critical_notifications";
const CRITICAL_COOLDOWN_MS = 45 * 60 * 1000; // 45 menit cooldown agar tidak spam

class NotificationService {
  private lastCriticalTimes: Record<string, number> = {};
  private isChannelInitialized = false;

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

  async initNotificationChannel(): Promise<void> {
    if (this.isChannelInitialized) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: NOTIF_CHANNEL_ID,
          name: "Perawatan Juro",
          description: "Notifikasi kebutuhan vital dan pengingat pet virtual Juro",
          importance: 4, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          vibration: true,
        });
        this.isChannelInitialized = true;
      } catch (err) {
        console.warn("Gagal membuat channel notifikasi native:", err);
      }
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
        await this.initNotificationChannel();
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

  async sendNotification(
    title: string,
    body: string,
    id = Math.floor(Math.random() * 100000)
  ) {
    if (!this.isEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await this.hasPermission();
        if (!hasPerm) return;

        await this.initNotificationChannel();
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              smallIcon: "ic_stat_name",
              channelId: NOTIF_CHANNEL_ID,
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

  calculateBackgroundSchedules(
    needs: CriticalNeeds,
    petName = "Juro",
    now = Date.now()
  ): BackgroundNotificationPlan[] {
    const plans: BackgroundNotificationPlan[] = [];

    // 1. Jadwal Pengingat Kelaparan
    if (needs.hunger <= 25) {
      plans.push({
        id: NOTIF_ID_HUNGER,
        title: `${petName} Sedang Kelaparan!`,
        body: `Perut ${petName} keroncongan. Yuk berikan camilan atau buah segar!`,
        triggerAt: new Date(now + 15 * 60 * 1000), // 15 menit ke depan
        channelId: NOTIF_CHANNEL_ID,
      });
    } else {
      // Hitung estimasi waktu hingga rasa lapar menyentuh 25
      const hoursToDecay = (needs.hunger - 25) / 2; // ~2 poin per jam
      const minutesToDecay = Math.max(30, Math.min(24 * 60, Math.round(hoursToDecay * 60)));
      plans.push({
        id: NOTIF_ID_HUNGER,
        title: `${petName} Mulai Lapar!`,
        body: `${petName} sudah mulai lapar di lembah. Sempatkan beri makan ya!`,
        triggerAt: new Date(now + minutesToDecay * 60 * 1000),
        channelId: NOTIF_CHANNEL_ID,
      });
    }

    // 2. Jadwal Pengingat Tidur / Energi
    if (needs.energy <= 20) {
      plans.push({
        id: NOTIF_ID_BEDTIME,
        title: `${petName} Sangat Mengantuk!`,
        body: `Energi ${petName} hampir habis. Waktunya taruh ${petName} di tempat tidur.`,
        triggerAt: new Date(now + 20 * 60 * 1000),
        channelId: NOTIF_CHANNEL_ID,
      });
    } else {
      // Jadwalkan jam tidur malam pukul 21:30
      const bedtimeTarget = new Date(now);
      bedtimeTarget.setHours(21, 30, 0, 0);
      if (bedtimeTarget.getTime() <= now) {
        bedtimeTarget.setDate(bedtimeTarget.getDate() + 1);
      }
      plans.push({
        id: NOTIF_ID_BEDTIME,
        title: `Waktu Istirahat ${petName}`,
        body: `Malam telah tiba di lembah. Antarkan ${petName} ke ranjang empuknya yuk!`,
        triggerAt: bedtimeTarget,
        channelId: NOTIF_CHANNEL_ID,
      });
    }

    // 3. Jadwal Sapaan Kangen (Jika tidak membuka app selama 6 jam)
    plans.push({
      id: NOTIF_ID_GREETING,
      title: `${petName} Menunggumu di Lembah`,
      body: `${petName} sedang santai di lembah dan kangen bermain denganmu.`,
      triggerAt: new Date(now + 6 * 60 * 60 * 1000),
      channelId: NOTIF_CHANNEL_ID,
    });

    return plans;
  }

  async scheduleBackgroundAlerts(
    needs: CriticalNeeds,
    petName = "Juro"
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;

    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await this.hasPermission();
        if (!hasPerm) return false;

        await this.initNotificationChannel();
        await this.cancelScheduledAlerts();

        const plans = this.calculateBackgroundSchedules(needs, petName);
        const notifications = plans.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          schedule: {
            at: p.triggerAt,
            allowWhileIdle: true,
          },
          channelId: NOTIF_CHANNEL_ID,
          smallIcon: "ic_stat_name",
        }));

        await LocalNotifications.schedule({ notifications });
        return true;
      } catch (err) {
        console.warn("Gagal menjadwalkan notifikasi latar belakang native:", err);
        return false;
      }
    }

    return false;
  }

  async cancelScheduledAlerts(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({
          notifications: [
            { id: NOTIF_ID_HUNGER },
            { id: NOTIF_ID_BEDTIME },
            { id: NOTIF_ID_CLEANLINESS },
            { id: NOTIF_ID_GREETING },
          ],
        });
      } catch {
        // Abaikan jika tidak ada jadwal tertunda
      }
    }
  }

  async notifyPartnerAction(partnerName: string, actionDescription: string) {
    if (!this.isEnabled()) return;

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
          NOTIF_ID_HUNGER
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
          NOTIF_ID_BEDTIME
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
          NOTIF_ID_CLEANLINESS
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
