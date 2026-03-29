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
