import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  X,
  Loader2,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  GraduationCap,
  Heart,
  TrendingDown,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import { generateBalanceSheetReport } from '../utils/generateBalanceSheetReport';
import { ReportResult } from '../utils/generateReports';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Deposit',
  ONLINE: 'Online',
  CHEQUE: 'Cheque',
};

const INCOME_CATEGORY_LABELS: Record<string, string> = {
  DONATION: 'Donation',
  IFTAR_DONATION: 'Iftar Donation',
  FIXED_DEPOSIT_PROFIT: 'Fixed Deposit Profit',
  LAND_SHARE_RENT: 'Land Share & Rent',
  SOLAR_PANEL_PROFIT: 'Solar Panel Profit',
  ALMS_BOX: 'Alms Box',
  OTHER: 'Other Income',
};

const FEE_CATEGORY_LABELS: Record<string, string> = {
  FEE_MONTHLY: 'Monthly Hostel Fee',
  FEE_EXAM: 'Exam Fee',
  FEE_ADMISSION: 'Admission Fee',
  FEE_OTHER: 'Other Student Fee',
};

const EXPENDITURE_CATEGORY_LABELS: Record<string, string> = {
  COOKING: 'Cooking',
  ADMINISTRATION: 'Administration',
  DEVELOPMENT: 'Development',
  OTHERS: 'Others',
};

const BalanceSheetPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<'income' | 'expenditure'>('income');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState<ReportResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['balanceSheet', currentMonth],
    queryFn: async () => {
      const response = await api.get('/balance-sheet', {
        params: { month: currentMonth },
      });
      return response.data;
    },
  });

  const sheetData = data?.data;

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Generate and preview report
  const handlePreviewReport = useCallback(async () => {
    if (!sheetData) return;
    setIsGenerating(true);
    try {
      if (previewResult) {
        URL.revokeObjectURL(previewResult.blobUrl);
      }
      const result = await generateBalanceSheetReport(sheetData);
      setPreviewResult(result);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast.error('Failed to generate PDF preview');
    } finally {
      setIsGenerating(false);
    }
  }, [sheetData, previewResult]);

  const handleDownloadFromPreview = () => {
    if (!previewResult) return;
    const link = document.createElement('a');
    link.href = previewResult.blobUrl;
    link.download = previewResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report PDF downloaded successfully!');
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setTimeout(() => {
      if (previewResult) {
        URL.revokeObjectURL(previewResult.blobUrl);
        setPreviewResult(null);
      }
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-gray-500">Loading balance sheet...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Income',
      value: sheetData?.income?.total || 0,
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-100',
    },
    {
      label: 'Total Expenditures',
      value: sheetData?.expenditure?.total || 0,
      icon: ArrowDownRight,
      gradient: 'from-rose-500 to-red-600',
      shadow: 'shadow-rose-100',
    },
    {
      label: sheetData?.netBalance >= 0 ? 'Surplus (Net Gain)' : 'Deficit (Net Loss)',
      value: sheetData?.netBalance || 0,
      icon: Coins,
      gradient: sheetData?.netBalance >= 0
        ? 'from-indigo-500 to-violet-600'
        : 'from-amber-500 to-orange-600',
      shadow: sheetData?.netBalance >= 0 ? 'shadow-indigo-100' : 'shadow-amber-100',
    },
  ];

  // Safely calculate percentages
  const getPercentageOfIncome = (val: number) => {
    const total = sheetData?.income?.total || 0;
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const getPercentageOfExpense = (val: number) => {
    const total = sheetData?.expenditure?.total || 0;
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-3xl font-extrabold tracking-tight text-gray-900">Monthly Balance Sheet</h2>
          <p className="mt-1 flex items-center gap-2 font-medium text-gray-500">
            <FileSpreadsheet size={16} className="text-indigo-500" />
            Consolidated view of all student fees, manual income, and expenditures.
          </p>
        </div>

        {/* Month Selector and Download Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-950 transition-all active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="border-none bg-transparent px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-0"
            />
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-950 transition-all active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <Button
            onClick={handlePreviewReport}
            disabled={isGenerating || !sheetData}
            className="flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 shadow-xl shadow-indigo-200/50 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin shrink-0" />
            ) : (
              <Eye size={18} className="shrink-0" />
            )}
            <span className="text-sm font-semibold">{isGenerating ? 'Generating...' : 'Preview Report'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={`group relative overflow-hidden border-none bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              padding="none"
            >
              <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-white/[0.07] pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-3 p-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{kpi.label}</p>
                  <h3 className="mt-1.5 text-2xl font-black leading-none tracking-tight text-white">
                    {formatCurrency(kpi.value)}
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white backdrop-blur-md transition-all group-hover:scale-105">
                  <Icon size={22} className="stroke-[2.5]" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Breakdowns & Chart Visuals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Income Breakdown Card */}
        <Card className="rounded-2xl border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Income Breakdown</h3>
              <p className="text-xs text-gray-500 font-medium">Month total: {formatCurrency(sheetData?.income?.total || 0)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {/* Student Fees group */}
            <div>
              <div className="flex items-center justify-between text-sm font-bold text-gray-800">
                <span className="flex items-center gap-1.5"><GraduationCap size={16} className="text-emerald-500" /> Student Fees</span>
                <span>{formatCurrency(sheetData?.income?.breakdown?.studentFees?.total || 0)}</span>
              </div>
              <div className="mt-3 space-y-2.5 pl-5 border-l-2 border-emerald-100">
                {Object.entries(sheetData?.income?.breakdown?.studentFees || {}).map(([key, val]) => {
                  if (key === 'total') return null;
                  const amt = val as number;
                  const label = FEE_CATEGORY_LABELS[`FEE_${key.toUpperCase()}`] || key;
                  return (
                    <div key={key} className="text-xs">
                      <div className="flex items-center justify-between text-gray-600 mb-1">
                        <span>{label}</span>
                        <span className="font-semibold">{formatCurrency(amt)} ({getPercentageOfIncome(amt)}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${getPercentageOfIncome(amt)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Donations group */}
            <div>
              <div className="flex items-center justify-between text-sm font-bold text-gray-800">
                <span className="flex items-center gap-1.5"><Heart size={16} className="text-rose-400" /> Donations</span>
                <span>{formatCurrency(sheetData?.income?.breakdown?.donations?.total || 0)}</span>
              </div>
              <div className="mt-3 space-y-2.5 pl-5 border-l-2 border-rose-100">
                {Object.entries(sheetData?.income?.breakdown?.donations || {}).map(([key, val]) => {
                  if (key === 'total') return null;
                  const amt = val as number;
                  const label = INCOME_CATEGORY_LABELS[key.toUpperCase()] || key;
                  return (
                    <div key={key} className="text-xs">
                      <div className="flex items-center justify-between text-gray-600 mb-1">
                        <span>{label}</span>
                        <span className="font-semibold">{formatCurrency(amt)} ({getPercentageOfIncome(amt)}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-rose-400 transition-all duration-500"
                          style={{ width: `${getPercentageOfIncome(amt)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Income group */}
            <div>
              <div className="flex items-center justify-between text-sm font-bold text-gray-800">
                <span className="flex items-center gap-1.5"><Coins size={16} className="text-amber-500" /> Other Income</span>
                <span>{formatCurrency(sheetData?.income?.breakdown?.otherIncome?.total || 0)}</span>
              </div>
              <div className="mt-3 space-y-2.5 pl-5 border-l-2 border-amber-100">
                {Object.entries(sheetData?.income?.breakdown?.otherIncome || {}).map(([key, val]) => {
                  if (key === 'total') return null;
                  const amt = val as number;
                  // Convert camelCase key to SCREAMING_SNAKE_CASE to match the map keys
                  const categoryKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
                  const label = INCOME_CATEGORY_LABELS[categoryKey] || key;
                  return (
                    <div key={key} className="text-xs">
                      <div className="flex items-center justify-between text-gray-600 mb-1">
                        <span>{label}</span>
                        <span className="font-semibold">{formatCurrency(amt)} ({getPercentageOfIncome(amt)}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${getPercentageOfIncome(amt)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Expenditure Breakdown Card */}
        <Card className="rounded-2xl border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
              <TrendingDown size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Expenditure Breakdown</h3>
              <p className="text-xs text-gray-500 font-medium">Month total: {formatCurrency(sheetData?.expenditure?.total || 0)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {Object.entries(sheetData?.expenditure?.breakdown || {}).map(([key, val]) => {
              const amt = val as number;
              const label = EXPENDITURE_CATEGORY_LABELS[key.toUpperCase()] || key;
              const pct = getPercentageOfExpense(amt);
              return (
                <div key={key} className="text-sm">
                  <div className="flex items-center justify-between text-gray-700 font-medium mb-1.5">
                    <span>{label}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(amt)} <span className="text-xs font-normal text-gray-500">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {sheetData?.expenditure?.total === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Info size={32} className="mb-2" />
                <p className="text-sm font-medium">No expenditures recorded for this month</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Transaction Details Ledger */}
      <Card className="overflow-hidden rounded-2xl border-none shadow-md bg-white p-0">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-sans">Transaction Ledger</h3>
            <p className="text-xs text-gray-500 font-medium">Detailed log of this month's receipts and payments</p>
          </div>
          <div className="flex gap-2 p-1 rounded-xl bg-gray-100 w-fit">
            <button
              onClick={() => setActiveTab('income')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'income'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Income ({sheetData?.income?.transactions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('expenditure')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'expenditure'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Expenditures ({sheetData?.expenditure?.transactions?.length || 0})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'income' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/20">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Receipt No</th>
                  <th className="px-6 py-4">Payer/Source</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(sheetData?.income?.transactions || []).map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-gray-800">{row.receiptNumber || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.payerName || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={row.source === 'FEE' ? 'info' : 'success'}>
                        {row.categoryLabel}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-emerald-600">
                      +{formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}

                {(sheetData?.income?.transactions || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <Info className="mx-auto mb-2 text-gray-300" size={32} />
                      <p className="text-sm font-medium">No income records found for this period</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/20">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Detail</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(sheetData?.expenditure?.transactions || []).map((row: any) => {
                  const detailText = [
                    row.vendor ? `Vendor: ${row.vendor}` : '',
                    row.billNumber ? `Bill: ${row.billNumber}` : '',
                  ].filter(Boolean).join(', ') || '-';

                  return (
                    <tr key={row.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">{formatDate(row.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{row.description}</td>
                      <td className="px-6 py-4">
                        <Badge variant="warning">{row.categoryLabel}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium max-w-[200px] truncate">{detailText}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-rose-600">
                        -{formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                })}

                {(sheetData?.expenditure?.transactions || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <Info className="mx-auto mb-2 text-gray-300" size={32} />
                      <p className="text-sm font-medium">No expenditure records found for this period</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ===== PDF PREVIEW MODAL ===== */}
      {isPreviewOpen && previewResult && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Report Preview</h3>
                <p className="text-[11px] text-gray-400 font-medium">{previewResult.filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadFromPreview}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <Download size={16} />
                Download PDF
              </button>
              <button
                onClick={handleClosePreview}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* PDF Frame */}
          <div className="flex-1 p-4 overflow-hidden">
            <iframe
              src={previewResult.blobUrl}
              title="Report Preview"
              className="w-full h-full rounded-xl border border-white/10 shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheetPage;
