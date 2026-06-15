const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push no soportado en este navegador');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Permiso de notificaciones denegado:', permission);
    return null;
  }

  const reg = await navigator.serviceWorker.ready;

  // Si ya hay una suscripción activa, no volver a suscribirse
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  // Obtener VAPID key del backend
  const vapidRes = await fetch(`${API_URL}/api/notifications/push/vapid-key`);
  if (!vapidRes.ok) {
    console.error('Error al obtener VAPID key:', vapidRes.status);
    return null;
  }
  const { publicKey } = await vapidRes.json();

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Enviar al backend
  const subRes = await fetch(`${API_URL}/api/notifications/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('kh_token')}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!subRes.ok) {
    console.error('Error al guardar suscripción en el backend:', subRes.status, await subRes.text());
    return null;
  }

  console.log('✅ Suscripción a push registrada');
  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}
