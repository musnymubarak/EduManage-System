import { PrismaClient, InventoryCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@samaiyamadrasa.edu',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      phoneNumber: '+94771234567',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Super Admin created:', superAdmin.username);

  // Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { year: '2024-2025' },
    update: {},
    create: {
      year: '2024-2025',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      isCurrent: true,
    },
  });

  console.log('✅ Academic Year created:', academicYear.year);

  // Create Classes
  const classes = [
    { name: '9A', grade: 9, section: 'A', academicYear: '2024-2025', capacity: 30 },
    { name: '9B', grade: 9, section: 'B', academicYear: '2024-2025', capacity: 30 },
    { name: '10A', grade: 10, section: 'A', academicYear: '2024-2025', capacity: 30 },
    { name: '10B', grade: 10, section: 'B', academicYear: '2024-2025', capacity: 30 },
    { name: '11A', grade: 11, section: 'A', academicYear: '2024-2025', capacity: 30 },
    { name: '11B', grade: 11, section: 'B', academicYear: '2024-2025', capacity: 30 },
    { name: '12', grade: 12, section: null, academicYear: '2024-2025', capacity: 30 },
    { name: '13', grade: 13, section: null, academicYear: '2024-2025', capacity: 30 },
    { name: '14', grade: 14, section: null, academicYear: '2024-2025', capacity: 30 },
  ];

  for (const classData of classes) {
    await prisma.class.upsert({
      where: { name: classData.name },
      update: {},
      create: classData,
    });
  }

  console.log('✅ Classes created: 9A, 9B, 10A, 10B, 11A, 11B, 12, 13, 14');

  // Create sample inventory items
 const inventoryItems = [
  { itemName: 'Student Tables', category: InventoryCategory.FURNITURE, quantity: 150, minQuantity: 20, unit: 'pieces' },
  { itemName: 'Student Chairs', category: InventoryCategory.FURNITURE, quantity: 150, minQuantity: 20, unit: 'pieces' },
  { itemName: 'Whiteboard Markers (Black)', category: InventoryCategory.STATIONERY, quantity: 50, minQuantity: 10, unit: 'pieces' },
  { itemName: 'Whiteboard Markers (Blue)', category: InventoryCategory.STATIONERY, quantity: 50, minQuantity: 10, unit: 'pieces' },
  { itemName: 'Whiteboard Markers (Red)', category: InventoryCategory.STATIONERY, quantity: 30, minQuantity: 10, unit: 'pieces' },
  { itemName: 'Whiteboard Erasers', category: InventoryCategory.STATIONERY, quantity: 20, minQuantity: 5, unit: 'pieces' },
  { itemName: 'Exercise Books', category: InventoryCategory.STATIONERY, quantity: 500, minQuantity: 100, unit: 'pieces' },
  { itemName: 'Pens (Blue)', category: InventoryCategory.STATIONERY, quantity: 200, minQuantity: 50, unit: 'pieces' },
];

  for (const item of inventoryItems) {
    await prisma.inventory.create({
      data: item,
    });
  }

  console.log('✅ Sample inventory items created');

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: 'monthly_fee_amount' },
    update: {},
    create: {
      key: 'monthly_fee_amount',
      value: '2000', // LKR 2000 per month
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'admission_fee_amount' },
    update: {},
    create: {
      key: 'admission_fee_amount',
      value: '5000', // LKR 5000 one-time
    },
  });

  console.log('✅ System settings created');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Default Super Admin Credentials:');
  console.log('   Username: superadmin');
  console.log('   Password: Admin@123');
  console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
