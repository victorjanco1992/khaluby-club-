import { prisma } from './prisma.js';

// Valores por defecto
const DEFAULTS = {
  // Puntos
  points_transfer_amount:  '1000', // $1000 por transferencia = 1 punto
  points_transfer_per:     '1',    // puntos otorgados
  points_cash_amount:      '1000', // $1000 en efectivo = 2 puntos
  points_cash_per:         '2',    // puntos otorgados (doble)

  // Sorteos
  raffle_amount_per_number: '5000', // $5000 = 1 número
  raffle_cash_bonus:        '1',    // números extra por pagar en efectivo
};

export async function getConfig() {
  const rows = await prisma.storeConfig.findMany();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });

  // Mezclar con defaults
  const merged = { ...DEFAULTS, ...map };

  return {
    // Puntos por transferencia/QR: cada X pesos = Y puntos
    pointsTransferAmount: parseFloat(merged.points_transfer_amount),
    pointsTransferPer:    parseFloat(merged.points_transfer_per),

    // Puntos por efectivo: cada X pesos = Y puntos
    pointsCashAmount: parseFloat(merged.points_cash_amount),
    pointsCashPer:    parseFloat(merged.points_cash_per),

    // Sorteos: cada X pesos = 1 número
    raffleAmountPerNumber: parseFloat(merged.raffle_amount_per_number),

    // Bonus de números por efectivo
    raffleCashBonus: parseInt(merged.raffle_cash_bonus),
  };
}

export async function setConfig(key, value) {
  return prisma.storeConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export function calculatePoints(amount, paymentMethod, config) {
  if (paymentMethod === 'CASH') {
    return Math.floor(amount / config.pointsCashAmount) * config.pointsCashPer;
  }
  return Math.floor(amount / config.pointsTransferAmount) * config.pointsTransferPer;
}

export function calculateRaffleNumbers(amount, paymentMethod, config) {
  const base = Math.floor(amount / config.raffleAmountPerNumber);
  const bonus = paymentMethod === 'CASH' ? config.raffleCashBonus : 0;
  return base > 0 ? base + bonus : 0;
}