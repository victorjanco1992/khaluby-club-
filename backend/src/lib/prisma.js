import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Aumentar timeout de transacciones a 30 segundos
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;