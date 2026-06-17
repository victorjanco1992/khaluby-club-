const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

function getToken() {
  return localStorage.getItem('kh_token');
}

export async function subscribeToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push no soportado en este navegador');
      return null;
    }
    if (!VAPID_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY no configurada');
      return null;
    }
    // Pedir permiso — DEBE venir de un gesto del usuario (click)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso denegado:', permission);
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    // Si ya hay suscripción activa, enviarla al backend igualmente
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await sendToBackend(existing);
      return existing;
    }
    // Crear nueva suscripción con la VAPID key del env
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });
    await sendToBackend(subscription);
    return subscription;
  } catch (err) {
    console.error('subscribeToPush error:', err);
    return null;
  }
}

async function sendToBackend(subscription) {
  const token = getToken();
  if (!token) {
    console.warn('No hay token, no se puede guardar suscripción');
    return;
  }
  const res = await fetch(`${API_URL}/api/notifications/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription }),
  });
  if (!res.ok) {
    console.error('Error guardando suscripción:', res.status, await res.text());
  } else {
    console.log('✅ Push suscripto correctamente');
  }
}

export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const token = getToken();
    if (token) {
      await fetch(`${API_URL}/api/notifications/push/unsubscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }
    await subscription.unsubscribe();
    console.log('Push desuscripto');
  } catch (err) {
    console.error('unsubscribeFromPush error:', err);
  }
}

// ⚠️ Esto SOLO indica el permiso del navegador — una vez otorgado, queda
// en 'granted' para siempre aunque el usuario se desuscriba dentro de la app.
// No usar solo esto para decidir qué mostrar en la UI.
export function getPushStatus() {
  if (!('Notification' in window) || !('PushManager' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ✅ Estado real combinando permiso del navegador + existencia de suscripción activa.
// Esto es lo que hay que usar para decidir si mostrar "Activar" o "Desactivar".
export async function getRealPushStatus() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';
  if (permission === 'default') return 'default';

  // permission === 'granted' → verificar si hay suscripción activa de verdad
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return subscription ? 'granted' : 'default';
  } catch {
    return 'default';
  }
}
