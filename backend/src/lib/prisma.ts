import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const engineType = process.env.PRISMA_CLIENT_ENGINE_TYPE;

if (databaseUrl && engineType === 'dataproxy') {
  const isProxyUrl =
    databaseUrl.startsWith('prisma://') ||
    databaseUrl.startsWith('prisma+postgres://') ||
    databaseUrl.startsWith('prisma-postgres://');

  if (!isProxyUrl) {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
