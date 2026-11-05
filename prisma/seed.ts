import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database';

export const sampleUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alice Sharma',
    email: 'alice@example.com',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Bob Verma',
    email: 'bob@example.com',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Charlie Patel',
    email: 'charlie@example.com',
  },
];

async function main() {
  await connectDatabase();
  console.log('🌱 Seeding sample users for testing...');

  for (const user of sampleUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, email: user.email },
      create: user,
    });
    console.log(`👤 Seeded user: ${user.name} (${user.id})`);
  }

  console.log('✅ Seeding completed successfully!');
  await disconnectDatabase();
}

main().catch(async (e) => {
  console.error('❌ Seeding failed:', e);
  await disconnectDatabase();
  process.exit(1);
});

