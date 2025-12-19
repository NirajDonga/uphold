"use client"
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

// Define interfaces for type safety
interface EarningsData {
  totals: {
    totalReceived: number;
    totalWithdrawn: number;
    netEarned: number;
  }
}

interface ApiResponse {
  balance?: number;
  error?: string;
  url?: string;
}

// Helper function to save state to localStorage
const saveStateToStorage = (key: string, value: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Helper function to load state from localStorage
const loadStateFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        return JSON.parse(savedValue) as T;
      } catch (e) {
        console.error('Failed to parse saved state', e);
        return defaultValue;
      }
    }
  }
  return defaultValue;
};

const FundsPage: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from localStorage or URL params
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>(() => {
    const urlAmount = searchParams.get('amount');
    if (urlAmount) return urlAmount;
    return loadStateFromStorage<string>('fundsPageAmount', '');
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'topup' | 'withdraw' | 'earnings'>(() => {
    return loadStateFromStorage<'topup' | 'withdraw' | 'earnings'>('fundsPageActiveTab', 'topup');
  });
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmationAction, setConfirmationAction] = useState<'topup' | 'withdraw' | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);
  
  // Save amount to localStorage whenever it changes
  useEffect(() => {
    saveStateToStorage('fundsPageAmount', amount);
  }, [amount]);
  
  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    saveStateToStorage('fundsPageActiveTab', activeTab);
  }, [activeTab]);

  const refreshBalance = async (): Promise<void> => {
    try {
      const res = await fetch('/api/funds/balance');
      const data: ApiResponse = await res.json();
      if (res.ok && data.balance !== undefined) {
        setBalance(data.balance);
      } else {
        console.error('Failed to fetch balance:', data.error);
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        await refreshBalance();
        const er = await fetch('/api/funds/earnings');
        if (er.ok) {
          const earningsData: EarningsData = await er.json();
          setEarnings(earningsData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    load();
  }, []);

  // Request top-up confirmation
  const confirmTopup = (e?: React.FormEvent): void => {
    if (e) e.preventDefault();
    setError('');
    
    // Validate amount
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber < 50) {
      setError('Minimum top-up is ₹50');
      toast.error('Minimum top-up is ₹50', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }
    
    setConfirmationAction('topup');
    setShowConfirmation(true);
  };
  
  // Cancel confirmation
  const cancelConfirmation = (): void => {
    setShowConfirmation(false);
    setConfirmationAction(null);
  };

  // Process the actual top-up
  const doTopup = async (): Promise<void> => {
    setShowConfirmation(false);
    setConfirmationAction(null);
    setError('');
    
    // Validate amount
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber < 50) {
      setError('Minimum top-up is ₹50');
      toast.error('Minimum top-up is ₹50', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/funds/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber })
      });
      
      const data: ApiResponse = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create payment');
        toast.error(data.error || 'Failed to create payment', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }
      
      if (data.url) {
        toast.success('Redirecting to payment...', {
          position: "top-right",
          autoClose: 2000,
          theme: "dark",
        });
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err) {
      console.error('Error during topup:', err);
      toast.error('An unexpected error occurred', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  // Request withdrawal confirmation
  const confirmWithdraw = (): void => {
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Please enter a valid amount', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }
    
    setConfirmationAction('withdraw');
    setShowConfirmation(true);
  };

  // Process the actual withdrawal
  const doWithdraw = async (): Promise<void> => {
    setShowConfirmation(false);
    setConfirmationAction(null);
    
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Please enter a valid amount', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/funds/withdraw', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ amount: amountNumber }) 
      });
      
      const data: ApiResponse = await res.json();
      
      if (res.ok) {
        await refreshBalance();
        setAmount('');
        toast.success(`Withdrawal of ₹${amountNumber} processed successfully!`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      } else {
        toast.error(`Withdrawal failed: ${data.error || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } catch (err) {
      console.error('Error during withdrawal:', err);
      toast.error('An unexpected error occurred during withdrawal', {
        position: "top-right", 
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-center text-white mb-6">Wallet</h1>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-300">Balance: {balance !== null ? Math.floor(balance) : ' '}</p>
            <button type="button" onClick={refreshBalance} className="text-sm text-white hover:text-gray-300 underline transition-colors">Refresh</button>
          </div>
          
          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-auto border border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Confirm {confirmationAction === 'topup' ? 'Top-up' : 'Withdrawal'}</h3>
                <p className="text-gray-300 mb-4">
                  Are you sure you want to {confirmationAction === 'topup' ? 'add' : 'withdraw'} <span className="font-bold">₹{Number(amount)}</span>?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={cancelConfirmation}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmationAction === 'topup' ? doTopup : doWithdraw}
                    className={`flex-1 text-white py-2 px-4 rounded-md transition-colors ${confirmationAction === 'topup' ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'}`}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs for better navigation and state persistence demonstration */}
          <div className="border-b border-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('topup')}
                className={`px-4 py-2 ${activeTab === 'topup' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-gray-400 hover:text-gray-200'}`}
              >
                Add Funds
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`px-4 py-2 ${activeTab === 'withdraw' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-gray-400 hover:text-gray-200'}`}
              >
                Withdraw
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`px-4 py-2 ${activeTab === 'earnings' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-gray-400 hover:text-gray-200'}`}
              >
                Earnings
              </button>
            </div>
          </div>
          
          {/* Tab content */}
          <div className="mt-4">
            {activeTab === 'topup' && (
              <form onSubmit={confirmTopup} className="space-y-4">
                <input
                  type="number"
                  min="50"
                  step="0.01"
                  placeholder="Amount (₹, min 50)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-2 px-3 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : 'Top-up (Stripe Checkout)'}
                </button>
                {error && <div className="text-red-400 text-sm">{error}</div>}
              </form>
            )}
            
            {activeTab === 'withdraw' && (
              <div className="space-y-4">
                <input
                  type="number"
                  min="50"
                  step="0.01"
                  placeholder="Amount to withdraw (₹)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors"
                  required
                />
                <button 
                  type="button" 
                  disabled={loading} 
                  onClick={confirmWithdraw} 
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold py-2 px-6 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : 'Withdraw Funds'}
                </button>
              </div>
            )}
            
            {activeTab === 'earnings' && earnings && (
              <div className="rounded-lg border border-gray-700 p-4">
                <h2 className="text-xl font-semibold mb-4">Your Earnings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-200">
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Total Received</div>
                    <div className="text-lg">{Math.floor(earnings.totals.totalReceived)}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Total Withdrawn</div>
                    <div className="text-lg">{Math.floor(earnings.totals.totalWithdrawn)}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Net Earned</div>
                    <div className="text-lg">{Math.floor(earnings.totals.netEarned)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundsPage;
