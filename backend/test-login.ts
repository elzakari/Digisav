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
    fs.writeFileSync('test-login-result.log', 'SUCCESS: ROLE=' + result.user.role);
  } catch (error: any) {
    const errorInfo = `FAILURE\nName: ${error.name}\nMessage: ${error.message}\nStack: ${error.stack}`;
    fs.writeFileSync('test-login-result.log', errorInfo);
  } finally {
    await prisma.$disconnect();
  }
}

test();
