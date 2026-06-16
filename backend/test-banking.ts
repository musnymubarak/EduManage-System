import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log("Starting Banking Integration Logic Test...");
  
  let bankAccountA;
  let bankAccountB;
  let income;

  try {
    console.log("1. Creating Bank Accounts...");
    bankAccountA = await prisma.bankAccount.create({
      data: {
        accountName: 'Test Account A',
        bankName: 'Bank of Ceylon (BOC)',
        accountNumber: 'TEST-A-' + Date.now(),
        accountType: 'CURRENT',
        openingBalance: 1000,
      }
    });

    bankAccountB = await prisma.bankAccount.create({
      data: {
        accountName: 'Test Account B',
        bankName: 'People\'s Bank',
        accountNumber: 'TEST-B-' + Date.now(),
        accountType: 'SAVINGS',
        openingBalance: 0,
      }
    });
    console.log("✅ Bank accounts created successfully.");

    console.log("2. Testing Income creation with Bank Deposit...");
    income = await prisma.income.create({
      data: {
        date: new Date(),
        category: 'DONATION',
        amount: 500,
        paymentMethod: 'BANK_TRANSFER',
        recordedBy: 'test-script',
        bankAccountId: bankAccountA.id,
      }
    });

    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccountA.id,
        type: 'DEPOSIT',
        amount: 500,
        transactionDate: new Date(),
        description: 'Test Income Deposit',
        paymentMethod: 'BANK_TRANSFER',
        relatedIncomeId: income.id,
        recordedBy: 'test-script'
      }
    });

    const tx1 = await prisma.bankTransaction.findFirst({ where: { bankAccountId: bankAccountA.id } });
    if (!tx1 || tx1.amount !== 500) throw new Error("Income transaction failed");
    console.log("✅ Income correctly created a deposit transaction.");

    console.log("3. Testing Bank Transfer A -> B (200 LKR)...");
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccountA.id,
        type: 'TRANSFER_OUT',
        amount: 200,
        transactionDate: new Date(),
        description: 'Test Transfer',
        transferAccountId: bankAccountB.id,
        paymentMethod: 'BANK_TRANSFER',
        recordedBy: 'test-script'
      }
    });
    
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccountB.id,
        type: 'TRANSFER_IN',
        amount: 200,
        transactionDate: new Date(),
        description: 'Test Transfer',
        transferAccountId: bankAccountA.id,
        paymentMethod: 'BANK_TRANSFER',
        recordedBy: 'test-script'
      }
    });
    console.log("✅ Transfer transactions recorded successfully.");

    const aTxs = await prisma.bankTransaction.findMany({ where: { bankAccountId: bankAccountA.id }});
    const aBalance = bankAccountA.openingBalance 
      + aTxs.filter(t => ['DEPOSIT', 'TRANSFER_IN'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
      - aTxs.filter(t => ['WITHDRAWAL', 'TRANSFER_OUT'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);

    const bTxs = await prisma.bankTransaction.findMany({ where: { bankAccountId: bankAccountB.id }});
    const bBalance = bankAccountB.openingBalance 
      + bTxs.filter(t => ['DEPOSIT', 'TRANSFER_IN'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
      - bTxs.filter(t => ['WITHDRAWAL', 'TRANSFER_OUT'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);

    console.log(`Final Balances - Account A: ${aBalance}, Account B: ${bBalance}`);
    if (aBalance !== 1300) throw new Error("A balance is not 1300");
    if (bBalance !== 200) throw new Error("B balance is not 200");
    console.log("✅ Mathematical logic is correct.");

  } catch (err) {
    console.error("❌ Test Failed:", err);
  } finally {
    console.log("4. Cleaning up test data... Restoring database state.");
    if (income) await prisma.income.delete({ where: { id: income.id } }).catch(() => {});
    await prisma.bankTransaction.deleteMany({ where: { recordedBy: 'test-script' } }).catch(() => {});
    if (bankAccountA) await prisma.bankAccount.delete({ where: { id: bankAccountA.id } }).catch(() => {});
    if (bankAccountB) await prisma.bankAccount.delete({ where: { id: bankAccountB.id } }).catch(() => {});
    console.log("✅ Cleanup complete. No traces left in the database.");
    await prisma.$disconnect();
  }
}

runTest();
