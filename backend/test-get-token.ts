import { AuthService } from './src/services/auth/auth.service';
import prisma from './src/lib/prisma';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function test() {
  const authService = new AuthService();
  const email = 'elzakari@outlook.com';
  const password = 'Barbie@2026#1';

  try {
    const result = await authService.login(email, password);
    fs.writeFileSync('test-token.txt', result.accessToken);
    console.log('Token saved to test-token.txt');
  } catch (error: any) {
    console.error('Login failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
