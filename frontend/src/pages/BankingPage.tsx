import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { ActionMenu } from '../components/UI/ActionMenu';
import { BankAccount, BankTransaction } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Landmark, ArrowRightLeft, PlusCircle, Wallet, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AddBankAccountModal from '../components/Finance/AddBankAccountModal';
import RecordBankTransactionModal from '../components/Finance/RecordBankTransactionModal';
import BankTransferModal from '../components/Finance/BankTransferModal';

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'TRANSACTIONS'>('ACCOUNTS');
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | undefined>();
  const [transactionFilterAccount, setTransactionFilterAccount] = useState<string>('ALL');

  const { data: accountsData, refetch: refetchAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => api.get('/banking/accounts').then(res => res.data.data as BankAccount[]),
  });

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['bankingSummary'],
    queryFn: () => api.get('/banking/summary').then(res => res.data.data),
  });

  const { data: transactionsData, refetch: refetchTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['bankTransactions', transactionFilterAccount],
    queryFn: async () => {
      const targetId = transactionFilterAccount === 'ALL' && accountsData?.length ? accountsData[0].id : transactionFilterAccount;
      if (!targetId || targetId === 'ALL') return [];
      return api.get(`/banking/accounts/${targetId}/transactions`).then(res => res.data.data as BankTransaction[]);
    },
    enabled: !!accountsData,
  });

  useEffect(() => {
    if (transactionFilterAccount === 'ALL' && accountsData?.length) {
      setTransactionFilterAccount(accountsData[0].id);
    }
  }, [accountsData, transactionFilterAccount]);

  const handleDeactivate = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this bank account?')) {
      try {
        await api.delete(`/banking/accounts/${id}`);
        toast.success('Bank account deactivated successfully');
        refetchAccounts();
      } catch (error) {
        toast.error('Failed to deactivate bank account');
      }
    }
  };

  const handleSuccess = () => {
    refetchAccounts();
    refetchSummary();
    refetchTransactions();
    setIsAddAccountModalOpen(false);
    setIsTransactionModalOpen(false);
    setIsTransferModalOpen(false);
  };

  const totalBalance = accountsData?.reduce((sum, acc) => sum + acc.currentBalance, 0) || 0;
  const activeAccountsCount = accountsData?.filter(a => a.isActive).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-indigo-600" />
            Banking & Accounts
          </h1>
          <p className="text-gray-500 mt-1">Manage bank accounts, transfers, and transactions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Transfer
          </Button>
          <Button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            <PlusCircle className="w-4 h-4" /> Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Balance</p>
              <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 shadow-sm border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Accounts</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{activeAccountsCount}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 shadow-sm border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Monthly Deposits</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summaryData?.monthlyDeposits || 0)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 shadow-sm border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Monthly Withdrawals</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summaryData?.monthlyWithdrawals || 0)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 flex">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'ACCOUNTS' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('ACCOUNTS')}
          >
            Bank Accounts
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'TRANSACTIONS' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('TRANSACTIONS')}
          >
            Ledger & Transactions
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Account Directory</h3>
                <Button onClick={() => { setSelectedAccount(undefined); setIsAddAccountModalOpen(true); }} variant="outline" size="sm" className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Add Account
                </Button>
              </div>
              
              <div className="overflow-x-auto pb-28">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountsLoading ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading accounts...</td></tr>
                    ) : accountsData?.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No bank accounts found</td></tr>
                    ) : accountsData?.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Landmark className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{account.accountName}</div>
                              <div className="text-sm text-gray-500">{account.bankName} • ****{account.accountNumber.slice(-4)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={account.accountType === 'SAVINGS' ? 'success' : account.accountType === 'FIXED_DEPOSIT' ? 'warning' : 'info'}>
                            {account.accountType.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(account.currentBalance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={account.isActive ? 'success' : 'danger'}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ActionMenu
                            items={[
                              {
                                label: 'View Transactions',
                                onClick: () => {
                                  setTransactionFilterAccount(account.id);
                                  setActiveTab('TRANSACTIONS');
                                },
                              },
                              {
                                label: 'Edit Account',
                                onClick: () => {
                                  setSelectedAccount(account);
                                  setIsAddAccountModalOpen(true);
                                },
                              },
                              ...(account.isActive ? [{
                                label: 'Deactivate',
                                onClick: () => handleDeactivate(account.id),
                                variant: 'danger' as 'danger',
                              }] : [])
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'TRANSACTIONS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Account:</span>
                  <select 
                    className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    value={transactionFilterAccount}
                    onChange={(e) => setTransactionFilterAccount(e.target.value)}
                  >
                    {accountsData?.map(a => (
                      <option key={a.id} value={a.id}>{a.accountName} (****{a.accountNumber.slice(-4)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref No.</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {txLoading ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading transactions...</td></tr>
                    ) : transactionsData?.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No transactions found for this account</td></tr>
                    ) : transactionsData?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {tx.description}
                          {tx.proofUrl && (
                            <a href={tx.proofUrl} target="_blank" rel="noreferrer" className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs inline-flex items-center">
                              View Proof
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={['DEPOSIT', 'TRANSFER_IN'].includes(tx.type) ? 'success' : 'danger'}>
                            {tx.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tx.referenceNumber || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${['DEPOSIT', 'TRANSFER_IN'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                          {['DEPOSIT', 'TRANSFER_IN'].includes(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddAccountModalOpen && (
        <AddBankAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => { setIsAddAccountModalOpen(false); setSelectedAccount(undefined); }}
          onSuccess={handleSuccess}
          editAccount={selectedAccount}
        />
      )}

      {isTransactionModalOpen && (
        <RecordBankTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {isTransferModalOpen && (
        <BankTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
