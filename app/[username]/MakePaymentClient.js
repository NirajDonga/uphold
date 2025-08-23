"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import 'react-toastify/dist/ReactToastify.css';

export default function MakePaymentClient({ username }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // Check if the current user is viewing their own profile
    if (session?.user?.username === username) {
      setIsOwnProfile(true);
    }
  }, [session, username]);

  const doDonate = async (amt) => {
    // Double-check to prevent self-payment
    if (isOwnProfile) {
      toast.error("You cannot pay yourself!", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const requestBody = { toUsername: username, amount: Math.floor(Number(amt || amount)), message };
      
      const res = await fetch('/api/funds/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        setAmount('');
        setMessage('');
        toast.success(`Payment of ₹${Math.floor(Number(amt || amount))} sent successfully!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error(`Payment failed: ${responseData.error || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      toast.error(`Payment failed: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show payment form if user is viewing their own profile
  if (isOwnProfile) {
    return (
      <div className='makepayment w-1/2 bg-slate-900 rounded-lg p-10'>
        <h2 className='make payment font-bold text-xl'>Your Profile</h2>
        <div className='text-center text-slate-400 mt-8'>
          <p>This is your own profile.</p>
          <p className='mt-2'>You cannot make payments to yourself.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='makepayment w-1/2 bg-slate-900 rounded-lg p-10'>
      <h2 className='make payment font-bold text-xl'>Make Payment</h2>
      <div className='flex gap-2 flex-col'>
        <input type='text' className='w-full p-3 rounded-lg bg-slate-800 mt-2' placeholder='Enter Name' value={username} disabled />
        <input type='text' className='w-full p-3 rounded-lg bg-slate-800' placeholder='Enter Message' value={message} onChange={e => setMessage(e.target.value)} />
        <input type='number' className='w-full p-3 rounded-lg bg-slate-800' placeholder='Enter Amount' value={amount} onChange={e => setAmount(e.target.value)} min={1} />
        <button type="button" className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2" onClick={() => doDonate()} disabled={loading}>{loading ? 'Processing...' : 'Pay'}</button>
      </div>
      <div className='flex gap-2 mt-5'>
        <button className='bg-slate-800 p-3 rounded-lg' onClick={() => doDonate(10)} disabled={loading}>{loading ? 'Processing...' : 'Pay 10'}</button>
        <button className='bg-slate-800 p-3 rounded-lg' onClick={() => doDonate(20)} disabled={loading}>{loading ? 'Processing...' : 'Pay 20'}</button>
        <button className='bg-slate-800 p-3 rounded-lg' onClick={() => doDonate(30)} disabled={loading}>{loading ? 'Processing...' : 'Pay 30'}</button>
      </div>
    </div>
  );
}
