import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial demo accounts...');

  const salt = await bcrypt.genSalt(10);
  const userPassword = await bcrypt.hash('User123!', salt);
  const adminPassword = await bcrypt.hash('Admin123!', salt);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Standard User',
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Demo accounts seeded:
  - Standard User: ${user.email} (Password: User123!)
  - System Admin:  ${admin.email} (Password: Admin123!)`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

