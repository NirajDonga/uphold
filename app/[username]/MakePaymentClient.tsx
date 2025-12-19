"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import 'react-toastify/dist/ReactToastify.css';
import type { ReactElement, ChangeEvent } from 'react';

interface MakePaymentClientProps {
  username: string;
}

export default function MakePaymentClient({ username }: MakePaymentClientProps): ReactElement {
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    // Check if the current user is viewing their own profile
    if (session?.user?.username === username) {
      setIsOwnProfile(true);
    }
  }, [session, username]);

  // Function to show the confirmation dialog
  const confirmDonation = (amt?: number): void => {
    const donationAmount = Math.floor(Number(amt || amount));
    if (isOwnProfile) {
      toast.error("You cannot pay yourself!");
      return;
    }
    
    if (isNaN(donationAmount) || donationAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setPendingAmount(donationAmount);
    setShowConfirmation(true);
  };
  
  // Function to cancel the donation
  const cancelDonation = (): void => {
    setPendingAmount(null);
    setShowConfirmation(false);
  };

  // Actual donation function that processes the payment
  const doDonate = async (amt?: number): Promise<void> => {
    if (isOwnProfile) {
      toast.error("You cannot pay yourself!");
      return;
    }

    const donationAmount = pendingAmount || Math.floor(Number(amt || amount));
    setShowConfirmation(false);
    setPendingAmount(null);
    setLoading(true);
    
    try {
      const requestBody = { 
        toUsername: username, 
        amount: donationAmount, 
        message 
      };
      
      const res = await fetch('/api/funds/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        setAmount('');
        setMessage('');
        toast.success(`Payment of ₹${donationAmount} sent successfully!`);
      } else {
        toast.error(`Payment failed: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
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
    <div className='makepayment w-full md:w-1/2 bg-black/20 backdrop-blur-sm border border-gray-800 rounded-xl p-8 shadow-xl'>
      <h2 className='make payment font-bold text-2xl mb-6 text-white'>Make Payment</h2>
      
      {showConfirmation ? (
        <div className="mt-4 bg-gray-900/50 p-6 rounded-xl border border-gray-700 animate-in fade-in zoom-in duration-200">
          <h3 className="text-lg font-semibold mb-3 text-white">Payment Confirmation</h3>
          <p className="text-gray-300 mb-6">Are you sure you want to pay <strong className="text-white">₹{pendingAmount}</strong> to <strong className="text-white">{username}</strong>?</p>
          
          <div className="flex gap-3">
            <button 
              onClick={cancelDonation}
              className="flex-1 bg-transparent border border-gray-600 hover:bg-gray-800 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={() => doDonate()}
              className="flex-1 bg-white text-black hover:bg-gray-200 py-3 px-4 rounded-lg transition-all duration-200 font-bold shadow-lg shadow-white/10"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-4 flex-col'>
            <div className="relative">
              <input 
                type='text' 
                className='w-full p-4 rounded-lg bg-gray-900/50 border border-gray-700 text-gray-400 focus:outline-none cursor-not-allowed' 
                value={`@${username}`} 
                disabled 
              />
            </div>
            <div className="relative">
              <input 
                type='text' 
                className='w-full p-4 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-1 focus:ring-white transition-all duration-200 outline-none' 
                placeholder='Leave a message...' 
                value={message} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)} 
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input 
                type='number' 
                className='w-full p-4 pl-8 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-1 focus:ring-white transition-all duration-200 outline-none font-mono text-lg' 
                placeholder='Enter Amount' 
                value={amount} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} 
                min={1} 
              />
            </div>
            <button 
              type="button" 
              className="w-full text-black bg-white hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-500 font-bold rounded-lg text-base px-5 py-4 text-center transition-all duration-200 shadow-lg shadow-white/5 mt-2" 
              onClick={() => confirmDonation()} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
          <div className='flex gap-3 mt-6'>
            <button 
              className='flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-lg transition-all duration-200 text-sm font-medium' 
              onClick={() => confirmDonation(10)} 
              disabled={loading}
            >
              ₹10
            </button>
            <button 
              className='flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-lg transition-all duration-200 text-sm font-medium' 
              onClick={() => confirmDonation(20)} 
              disabled={loading}
            >
              ₹20
            </button>
            <button 
              className='flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-lg transition-all duration-200 text-sm font-medium' 
              onClick={() => confirmDonation(30)} 
              disabled={loading}
            >
              ₹30
            </button>
          </div>
        </>
      )}
    </div>
  );
}
