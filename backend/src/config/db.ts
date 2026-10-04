import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Relational Database (Prisma)');
  } catch (error: any) {
    console.warn('⚠️ Relational Database connection notice:', error.message);
  }
}
