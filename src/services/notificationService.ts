// Hossidev Mobile & Web Notification Service

export interface SendNotificationOptions {
  title: string;
  body: string;
  level?: number;
  tankName?: string;
  isCritical?: boolean;
}

export const notificationService = {
  // Register Service Worker for PWA & Background Alerts
  registerServiceWorker: async (): Promise<ServiceWorkerRegistration | null> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[Hossidev PWA] Service Worker registrado com sucesso:', registration.scope);
        return registration;
      } catch (error) {
        console.warn('[Hossidev PWA] Erro ao registrar Service Worker:', error);
      }
    }
    return null;
  },

  // Request Notification Permissions from Mobile OS / Browser
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('Este dispositivo/navegador não suporta notificações de sistema.');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificações:', e);
      return 'denied';
    }
  },

  // Check Current Permission Status
  getPermissionStatus: (): NotificationPermission => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  // Trigger Rich Push Notification with Official Hossidev Icon & Vibration
  showSystemNotification: async ({
    title,
    body,
    level = 78,
    tankName = 'Tanque FW1 (Tratada)',
    isCritical = false,
  }: SendNotificationOptions) => {
    const permission = await notificationService.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissão para notificações não foi concedida no dispositivo.');
    }

    // Try sending via active Service Worker registration (supports rich action buttons and background tray)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const options: any = {
            body: `${tankName}: ${body}`,
            icon: '/icon.svg',
            badge: '/favicon.svg',
            vibrate: isCritical ? [300, 100, 300, 100, 600] : [200, 100, 200],
            tag: 'hossidev-water-status',
            renotify: true,
            requireInteraction: isCritical,
            data: {
              url: '/?view=tanks',
              level,
              timestamp: Date.now(),
            },
          };
          await reg.showNotification(title, options);
          return true;
        }
      } catch (swErr) {
        console.warn('[SW Notification fallback]:', swErr);
      }
    }

    // Fallback standard Web Notification API
    try {
      const notif = new Notification(title, {
        body: `${tankName}: ${body}`,
        icon: '/icon.svg',
        badge: '/favicon.svg',
        tag: 'hossidev-water-status',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (err) {
      console.error('Falha ao disparar notificação local:', err);
      throw err;
    }
  },
};
