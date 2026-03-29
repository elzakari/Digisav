import type { PrismaClient as PrismaClientType } from '@prisma/client';

const databaseUrlRaw = process.env.DATABASE_URL;
const engineTypeRaw = process.env.PRISMA_CLIENT_ENGINE_TYPE;

const databaseUrl = databaseUrlRaw?.trim().replace(/^['"]|['"]$/g, '');
const engineType = engineTypeRaw?.trim().replace(/^['"]|['"]$/g, '').toLowerCase();

if (engineType === 'dataproxy') {
  const isProxyUrl =
    !!databaseUrl &&
    (databaseUrl.startsWith('prisma://') ||
      databaseUrl.startsWith('prisma+postgres://') ||
      databaseUrl.startsWith('prisma-postgres://'));

  if (!isProxyUrl) process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
}

const { PrismaClient }: { PrismaClient: new () => PrismaClientType } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
