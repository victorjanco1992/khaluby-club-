import webpush from 'web-push';
import { prisma } from './prisma.js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPushToUser(userId, payload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  });

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(payload))
        .catch(async (err) => {
          // Suscripción vencida o inválida → borrar
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        })
    )
  );
  return results;
}

export async function sendPushToAll(payload) {
  const subscriptions = await prisma.pushSubscription.findMany();
  return Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(payload))
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        })
    )
  );
}
