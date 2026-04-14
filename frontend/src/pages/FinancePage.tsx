import React, { useState } from 'react';
import { 
  Clock, 
  Wallet,
  TrendingUp
} from 'lucide-react';
import FeesPage from './FeesPage';
import PaymentsPage from './PaymentsPage';

const FinancePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tracker' | 'ledger'>('tracker');

    return (
        <div className="space-y-6 pb-10">
            {/* Unified Finance Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                     <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                             <TrendingUp size={24} />
                        </div>
                        Finance Hub
                     </h2>
                     <p className="text-gray-500 mt-2 font-medium">Unified management for fee tracking and global accounting records.</p>
                </div>

                {/* Premium Tab Switcher */}
                <div className="bg-gray-200/50 p-1.5 rounded-2xl flex items-center gap-1 backdrop-blur-sm border border-white/50 shadow-inner">
                    <button
                        onClick={() => setActiveTab('tracker')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            activeTab === 'tracker'
                                ? 'bg-white text-blue-600 shadow-sm scale-[1.02]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
                        }`}
                    >
                        <Clock size={18} />
                        Monthly Tracker
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            activeTab === 'ledger'
                                ? 'bg-white text-blue-600 shadow-sm scale-[1.02]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
                        }`}
                    >
                        <Wallet size={18} />
                        General Ledger
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="transition-all duration-500 ease-in-out">
                {activeTab === 'tracker' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                         {/* We can pass optional props if needed, but FeesPage is self-contained */}
                         <FeesPage />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                         <PaymentsPage />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancePage;
