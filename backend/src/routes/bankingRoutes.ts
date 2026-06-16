import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  deactivateBankAccount,
  getAccountTransactions,
  getMonthlyBankingSummary,
  recordTransaction,
  transferBetweenAccounts,
  deleteTransaction,
} from '../controllers/bankingController';

const router = express.Router();

router.use(authenticateToken);

// Bank Accounts
router.get('/accounts', getAllBankAccounts);
router.post('/accounts', authorize('SUPER_ADMIN', 'ADMIN'), createBankAccount);
router.put('/accounts/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateBankAccount);
router.delete('/accounts/:id', authorize('SUPER_ADMIN', 'ADMIN'), deactivateBankAccount);

// Bank Transactions
router.get('/accounts/:id/transactions', getAccountTransactions);
router.get('/summary', getMonthlyBankingSummary);

router.post(
  '/transactions',
  authorize('SUPER_ADMIN', 'ADMIN'),
  upload.single('proof'),
  recordTransaction
);

router.post(
  '/transfer',
  authorize('SUPER_ADMIN', 'ADMIN'),
  transferBetweenAccounts
);

router.delete('/transactions/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteTransaction);

export default router;
