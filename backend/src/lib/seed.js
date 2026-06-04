import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const adminDni = process.env.ADMIN_DNI || '00000000';
  const existing = await prisma.user.findUnique({ where: { dni: adminDni } });

  if (!existing) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || 'Administrador',
        dni: adminDni,
        phone: process.env.ADMIN_PHONE || '1100000000',
        password: hashed,
        qrCode: uuidv4(),
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin creado — DNI:', adminDni);
  } else {
    console.log('ℹ️  Admin ya existe');
  }

  const promoCount = await prisma.promotion.count();
  if (promoCount === 0) {
    await prisma.promotion.createMany({
      data: [
        { title: '2x1 en Aceites', description: '**¡Llevá 2, pagá 1!** en aceites de girasol y mezcla.', category: 'Ofertas' },
        { title: 'Combo Desayuno', description: 'Café + Leche + Azúcar con **30% de descuento**.', category: 'Combos' },
        { title: 'Puntos x2 en Limpieza', description: 'Esta semana ganás **el doble de puntos** en limpieza.', category: 'Puntos' },
      ],
    });
    console.log('✅ Promociones creadas');
  }

  const rewardCount = await prisma.reward.count();
  if (rewardCount === 0) {
    await prisma.reward.createMany({
      data: [
        { name: 'Descuento $200', description: '$200 de descuento en tu próxima compra', pointsCost: 500, stock: -1 },
        { name: 'Producto Gratis', description: 'Un producto a elección hasta $500', pointsCost: 1200, stock: 20 },
        { name: 'Mega Descuento $1000', description: '$1000 off en compras mayores a $3000', pointsCost: 2500, stock: 10 },
      ],
    });
    console.log('✅ Recompensas creadas');
  }

  const raffleCount = await prisma.raffle.count();
  if (raffleCount === 0) {
    await prisma.raffle.create({
      data: {
        title: 'Gran Sorteo Mensual',
        description: '¡Participá y ganá una canasta completa!',
        prize: 'Canasta Premium $15.000',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    console.log('✅ Sorteo activo creado');
  }

  console.log('\n🎉 Seed completado!\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());