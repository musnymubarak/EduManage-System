import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  TrendingUp,
  GraduationCap,
  Heart,
  Coins,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { IncomeLedgerRow, IncomeLedgerSummary } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import { ActionMenu } from '../components/UI/ActionMenu';
import RecordIncomeModal from '../components/Finance/RecordIncomeModal';

const CATEGORY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Income' },
  { value: 'FEE_MONTHLY', label: 'Monthly Hostel Fee' },
  { value: 'FEE_EXAM', label: 'Exam Fee' },
  { value: 'FEE_ADMISSION', label: 'Admission Fee' },
  { value: 'FEE_OTHER', label: 'Other Student Fee' },
  { value: 'DONATION', label: 'Donation' },
  { value: 'IFTAR_DONATION', label: 'Iftar Donation' },
  { value: 'FIXED_DEPOSIT_PROFIT', label: 'Fixed Deposit Profit' },
  { value: 'LAND_SHARE_RENT', label: 'Land Share & Rent' },
  { value: 'SOLAR_PANEL_PROFIT', label: 'Solar Panel Profit' },
  { value: 'ALMS_BOX', label: 'Alms Box' },
  { value: 'OTHER', label: 'Other Income' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Deposit',
  ONLINE: 'Online',
  CHEQUE: 'Cheque',
};

const DONATION_CATEGORIES = ['DONATION', 'IFTAR_DONATION'];

const categoryBadgeVariant = (row: IncomeLedgerRow): 'info' | 'success' | 'warning' => {
  if (row.source === 'FEE') return 'info';
  if (DONATION_CATEGORIES.includes(row.category)) return 'success';
  return 'warning';
};

const IncomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['income', searchQuery, categoryFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/income?${params}`);
      return response.data;
    },
  });

  const rows: IncomeLedgerRow[] = data?.data || [];
  const summary: IncomeLedgerSummary = data?.summary || {
    count: 0,
    grandTotal: 0,
    studentFeesTotal: 0,
    donationsTotal: 0,
    otherIncomeTotal: 0,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/income/${id}`),
    onSuccess: () => {
      toast.success('Income record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete income record');
    },
  });

  const handleDelete = (row: IncomeLedgerRow) => {
    if (window.confirm('Are you sure you want to delete this income record? This action cannot be undone.')) {
      deleteMutation.mutate(row.id);
    }
  };

  const kpis = [
    { label: 'Total Income', value: summary.grandTotal, icon: TrendingUp, gradient: 'from-[#2563eb] to-[#4f46e5]' },
    { label: 'Student Fees', value: summary.studentFeesTotal, icon: GraduationCap, gradient: 'from-[#10b981] to-[#0d9488]' },
    { label: 'Donations', value: summary.donationsTotal, icon: Heart, gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
    { label: 'Other Sources', value: summary.otherIncomeTotal, icon: Coins, gradient: 'from-[#f59e0b] to-[#ea580c]' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-3xl font-extrabold tracking-tight text-gray-900">Income Ledger</h2>
          <p className="mt-1 flex items-center gap-2 font-medium text-gray-500">
            <Coins size={16} className="text-blue-500" />
            All income — student fees flow in automatically; other income is recorded here.
          </p>
        </div>
        <Button
          onClick={() => setIsRecordModalOpen(true)}
          className="flex h-12 items-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-6 shadow-xl shadow-blue-100 transition-all hover:scale-105 hover:bg-blue-700"
        >
          <Plus size={20} className="shrink-0" />
          <span className="text-sm font-medium">Record Income</span>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={`group relative overflow-hidden border-none bg-gradient-to-r ${kpi.gradient} shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1`}
              padding="none"
            >
              <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-white/[0.07]" />
              <div className="relative z-10 flex items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{kpi.label}</p>
                  <h3 className="mt-1 text-2xl font-black leading-none tracking-tight text-white">
                    {formatCurrency(kpi.value)}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-white backdrop-blur-md transition-all group-hover:scale-105">
                  <Icon size={20} className="stroke-[2.5]" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Helper note */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <span>
          Student fees (Monthly Hostel, Exam &amp; Admission) are recorded in the <strong>Student Ledger</strong> tab and
          appear here automatically. Use <strong>Record Income</strong> for donations and all other income sources.
        </span>
      </div>

      {/* Filters + table */}
      <Card className="overflow-hidden rounded-2xl border-none p-0 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-gray-50 bg-white p-6 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Donor, payer, receipt or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="w-full md:w-56">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border-none bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {CATEGORY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-40">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border-none bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="w-full md:w-40">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border-none bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="animate-pulse font-bold text-gray-400">Loading income...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No income records found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Source / Payer</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Method</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Receipt</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="transition-colors hover:bg-blue-50/10">
                    <td className="whitespace-nowrap px-8 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {row.date ? formatDate(row.date) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={categoryBadgeVariant(row)} className="text-[10px] font-bold uppercase tracking-wider">
                        {row.categoryLabel}
                      </Badge>
                      {row.source === 'FEE' && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">Auto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {row.payerName || <span className="text-gray-400">—</span>}
                      {row.description && (
                        <p className="text-[11px] font-normal text-gray-400">{row.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-black tracking-tighter text-blue-600">
                      {row.receiptNumber || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-gray-900">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            {
                              label: 'Delete',
                              icon: <Trash2 size={15} />,
                              onClick: () => handleDelete(row),
                              variant: 'danger',
                              hidden: !row.deletable,
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RecordIncomeModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} />
    </div>
  );
};

export default IncomePage;
