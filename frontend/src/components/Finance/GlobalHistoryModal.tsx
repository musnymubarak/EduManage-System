import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Modal } from '../UI/Modal';
import { Badge } from '../UI/Badge';
import { formatDate, formatCurrency } from '../../utils/helpers';

interface GlobalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalHistoryModal: React.FC<GlobalHistoryModalProps> = ({ isOpen, onClose }) => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['feesAllHistory'],
    queryFn: async () => {
      const response = await api.get('/fees/payments');
      return response.data;
    },
    enabled: isOpen
  });

  const history = historyData?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Consolidated Financial Ledger" size="xl">
        {isLoading ? (
            <div className="py-20 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Syncing Archive...</p>
            </div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50/50 text-left">
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Receipt No</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Student Identity</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Fee Type</th>
                            <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Collected</th>
                            <th className="p-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Auditor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400 italic">No transactions found in the archive.</td>
                            </tr>
                        ) : (
                            history.map((h: any) => (
                                <tr key={h.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="p-5 whitespace-nowrap text-gray-600 font-bold">{formatDate(h.paymentDate || h.createdAt)}</td>
                                    <td className="p-5 font-mono text-xs font-black text-blue-600 tracking-tighter">{h.receiptNumber || '—'}</td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                                {h.student?.fullName?.charAt(0)}
                                            </div>
                                            <span className="font-black text-gray-900">{h.student?.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <Badge 
                                            variant={h.feeType === 'MONTHLY' ? 'info' : h.feeType === 'EXAM' ? 'warning' : 'success'} 
                                            className="text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase truncate max-w-[120px]"
                                            title={h.remarks || h.feeType}
                                        >
                                            {h.feeType === 'OTHER' && h.remarks?.startsWith('Other: ') 
                                                ? h.remarks.split('|')[0].replace('Other: ', '').trim() 
                                                : h.feeType}
                                        </Badge>
                                    </td>
                                    <td className="p-5 text-right font-black text-gray-900">{formatCurrency(h.paidAmount)}</td>
                                    <td className="p-5 text-center">
                                        <Badge variant="default" className="text-[8px] font-black uppercase bg-gray-50 border-gray-100">
                                            {h.collector?.fullName?.split(' ')[0] || 'System'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}
    </Modal>
  );
};

export default GlobalHistoryModal;
