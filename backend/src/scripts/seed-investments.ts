import prisma from '@/lib/prisma';

async function main() {
  console.log('Seeding investment products...');

  const products = [
    // ETFs
    {
      symbol: 'VGT',
      name: 'Vanguard Information Technology ETF',
      description: 'Tracks tech index for high growth potential.',
      productType: 'ETF',
      assetClass: 'EQUITY',
      currentPrice: 540.25,
      prevClosePrice: 535.10,
    },
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      description: 'Tracks the 500 largest US companies.',
      productType: 'ETF',
      assetClass: 'EQUITY',
      currentPrice: 475.20,
      prevClosePrice: 478.45,
    },
    // Stocks
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      description: 'Consumer electronics and software giant.',
      productType: 'STOCK',
      assetClass: 'EQUITY',
      currentPrice: 185.92,
      prevClosePrice: 184.15,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      description: 'Global leader in cloud and software.',
      productType: 'STOCK',
      assetClass: 'EQUITY',
      currentPrice: 415.50,
      prevClosePrice: 410.20,
    },
    // Bonds
    {
      symbol: 'KEN-BOND-10Y',
      name: 'Kenya Government 10Y Bond',
      description: 'Stable fixed income from local government.',
      productType: 'BOND',
      assetClass: 'FIXED_INCOME',
      currentPrice: 100.00,
      prevClosePrice: 100.00,
    },
    // Money Market
    {
      symbol: 'MMF-LIQUID',
      name: 'DigiSav Money Market Fund',
      description: 'Highly liquid interest-bearing account.',
      productType: 'MONEY_MARKET',
      assetClass: 'CASH_EQUIVALENT',
      currentPrice: 1.00,
      prevClosePrice: 1.00,
    }
  ];

  for (const product of products) {
    await (prisma as any).investmentProduct.upsert({
      where: { symbol: product.symbol },
      update: product,
      create: product,
    });
  }

  console.log('Successfully seeded 6 investment products.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
