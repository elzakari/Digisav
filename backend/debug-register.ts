import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function test() {
  console.log('--- Auth Registration Debug ---');
  
  const testEmail = 'test-' + Date.now() + '@example.com';
  
  console.log('1. Checking for existing user: ' + testEmail);
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: testEmail },
          { phoneNumber: '+00000000' }
        ]
      }
    });
    console.log('   Done. Result:', existing ? 'Exists' : 'Not found');

    console.log('2. Hashing password...');
    const startTime = Date.now();
    const hash = await bcrypt.hash('password123', 12);
    console.log('   Done in ' + (Date.now() - startTime) + 'ms');

    console.log('3. Attempting to create user...');
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        phoneNumber: '+00000000-' + Date.now(),
        passwordHash: hash,
        fullName: 'Test User Debug',
        status: 'ACTIVE',
        role: 'MEMBER'
      }
    });
    console.log('   SUCCESS! Created User ID: ' + user.id);

  } catch (error: any) {
    console.error('--- FAILURE ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    console.error('Stack Trace:', error.stack);
  } finally {
    console.log('Closing database connection...');
    await prisma.$disconnect();
    console.log('Exiting.');
  }
}

test();
