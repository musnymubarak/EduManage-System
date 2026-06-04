/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-time, idempotent backfill: copy every legacy Donation row into the unified
 * Income model (category DONATION). Safe to re-run — rows already migrated are
 * skipped via the unique `sourceDonationId` key. The original Donation table is
 * left untouched as a historical backup.
 */
async function main() {
  console.log('💰 Migrating donations → income...');

  const donations = await prisma.donation.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`   Found ${donations.length} donation record(s).`);

  let migrated = 0;
  let skipped = 0;

  for (const d of donations) {
    const existing = await prisma.income.findUnique({
      where: { sourceDonationId: d.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const remarks = [d.donationType, d.purpose, d.remarks].filter(Boolean).join(' | ') || null;

    try {
      await prisma.income.create({
        data: {
          date: d.date,
          category: 'DONATION',
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          source: d.donorName,
          description: null,
          // Preserve the original receipt (e.g. DON-000001) as-is. The INC- counter
          // ignores non-INC prefixes, so there is no collision with new income receipts.
          receiptNumber: d.receiptNumber,
          remarks,
          sourceDonationId: d.id,
          recordedBy: d.recordedBy,
          createdAt: d.createdAt,
        },
      });
      migrated++;
    } catch (e: any) {
      // A duplicate receiptNumber (unique) shouldn't happen since donations have distinct
      // receipts, but if it does, retry once without the receipt so the row still migrates.
      if (e?.code === 'P2002') {
        await prisma.income.create({
          data: {
            date: d.date,
            category: 'DONATION',
            amount: d.amount,
            paymentMethod: d.paymentMethod,
            source: d.donorName,
            receiptNumber: null,
            remarks,
            sourceDonationId: d.id,
            recordedBy: d.recordedBy,
            createdAt: d.createdAt,
          },
        });
        migrated++;
      } else {
        throw e;
      }
    }
  }

  console.log(`\n✅ Migration complete. Migrated: ${migrated}, Skipped (already migrated): ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('❌ Error migrating donations to income:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
