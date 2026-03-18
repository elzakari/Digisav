import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function restoreAdmin() {
  try {
    const email = 'elzakari@outlook.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const hash = await bcrypt.hash('Barbie@2026#1', 12);
      await prisma.user.create({
        data: {
          email,
          phoneNumber: '+1000000000',
          passwordHash: hash,
          fullName: 'Zakari SuperAdmin',
          status: 'ACTIVE',
          role: 'SYS_ADMIN'
        }
      });
      console.log('Restored SYS_ADMIN elzakari@outlook.com');
    } else {
      console.log('SYS_ADMIN already exists.');
    }
  } catch (error) {
    console.error('Error restoring admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}
restoreAdmin();
