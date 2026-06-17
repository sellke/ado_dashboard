import { PrismaClient } from '@prisma/client';
import { bootstrapDefaultDataIfEmpty } from '@/lib/db/bootstrap';

const prisma = new PrismaClient();

bootstrapDefaultDataIfEmpty(prisma)
  .then(async (result) => {
    if (result.bootstrapped) {
      console.log(`Bootstrapped ${result.workstreamsCreated} default workstreams`);
    } else {
      console.log('Bootstrap skipped: workstreams already configured');
    }
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Bootstrap failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
