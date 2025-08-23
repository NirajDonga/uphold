"use client"
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const FundsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');
  const [toUsername, setToUsername] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  const refreshBalance = async () => {
    const res = await fetch('/api/funds/balance');
    const data = await res.json();
    if (res.ok) setBalance(data.balance);
  };

  useEffect(() => {
    const load = async () => {
      await refreshBalance();
      const er = await fetch('/api/funds/earnings');
      if (er.ok) setEarnings(await er.json());
    };
    load();
  }, []);

  useEffect(() => {
    if (toUsername.length > 0) {
      fetch('/api/users?action=usernames')
        .then(res => res.json())
        .then(data => {
          setUsernameSuggestions(data.usernames.filter(u => u.toLowerCase().includes(toUsername.toLowerCase())));
        });
    } else {
      setUsernameSuggestions([]);
    }
  }, [toUsername]);

  const resolveUserId = async (username) => {
    const res = await fetch(`/api/users?action=by-username&username=${encodeURIComponent(username)}`);
    if (res.ok) {
      const data = await res.json();
      return data.userId;
    }
    return null;
  };

  const doTopup = async (e) => {
    e.preventDefault();
    setError('');
    if (Number(amount) < 50) {
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
        body: JSON.stringify({ amount: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create payment');
        toast.error(data.error || 'Failed to create payment', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }
      toast.success('Redirecting to payment...', {
        position: "top-right",
        autoClose: 2000,
        theme: "dark",
      });
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const doDonate = async () => {
    setLoading(true);
    try {
      let userId = toUserId;
      if (!userId && toUsername) {
        userId = await resolveUserId(toUsername);
      }
      if (!userId) {
        setError('Please select a valid username');
        toast.error('Please select a valid username', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }
      const res = await fetch('/api/funds/donate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: userId, amount: Math.floor(Number(amount)) }) });
      if (res.ok) {
        await refreshBalance();
        setAmount('');
        setToUsername('');
        toast.success(`Donation of ₹${Math.floor(Number(amount))} sent successfully!`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      } else {
        const errorData = await res.json();
        toast.error(`Donation failed: ${errorData.error || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const doWithdraw = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/funds/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount) }) });
      if (res.ok) {
        await refreshBalance();
        setAmount('');
        toast.success(`Withdrawal of ₹${Number(amount)} processed successfully!`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      } else {
        const errorData = await res.json();
        toast.error(`Withdrawal failed: ${errorData.error || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-center text-white mb-8">Wallet</h1>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-300">Balance: {balance !== null ? Math.floor(balance) : ' '}</p>
            <button type="button" onClick={refreshBalance} className="text-sm text-blue-400">Refresh</button>
          </div>
          <form onSubmit={doTopup} className="space-y-4">
            <input
              type="number"
              min="50"
              step="0.01"
              placeholder="Amount (₹, min 50)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-md">
              {loading ? 'Redirecting...' : 'Top-up (Stripe Checkout)'}
            </button>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </form>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Donate to username"
              value={toUsername}
              onChange={e => setToUsername(e.target.value)}
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="off"
            />
            {usernameSuggestions.length > 0 && (
              <ul className="bg-slate-800 rounded shadow max-h-40 overflow-y-auto absolute z-10">
                {usernameSuggestions.map(u => (
                  <li key={u} className="p-2 hover:bg-slate-700 cursor-pointer" onClick={() => setToUsername(u)}>{u}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={loading} onClick={doDonate} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-3 rounded-md">Donate</button>
              <button type="button" disabled={loading} onClick={doWithdraw} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-md">Withdraw</button>
            </div>
          </div>
          {earnings && (
            <div className="rounded-lg border border-gray-700 p-4">
              <h2 className="text-xl font-semibold mb-2">Earnings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-gray-200">
                <div>
                  <div className="text-sm text-gray-400">Total Received</div>
                  <div className="text-lg">{Math.floor(earnings.totals.totalReceived)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Withdrawn</div>
                  <div className="text-lg">{Math.floor(earnings.totals.totalWithdrawn)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Net Earned</div>
                  <div className="text-lg">{Math.floor(earnings.totals.netEarned)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundsPage;


