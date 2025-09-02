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
    <div className='makepayment w-1/2 bg-slate-900 rounded-lg p-10'>
      <h2 className='make payment font-bold text-xl'>Make Payment</h2>
      
      {showConfirmation ? (
        <div className="mt-4 bg-slate-800 p-5 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Payment Confirmation</h3>
          <p className="text-gray-300 mb-2">Are you sure you want to pay <strong>₹{pendingAmount}</strong> to <strong>{username}</strong>?</p>
          
          <div className="flex gap-3 mt-4">
            <button 
              onClick={cancelDonation}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => doDonate()}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-2 flex-col'>
            <input 
              type='text' 
              className='w-full p-3 rounded-lg bg-slate-800 mt-2' 
              placeholder='Username' 
              value={username} 
              disabled 
            />
            <input 
              type='text' 
              className='w-full p-3 rounded-lg bg-slate-800' 
              placeholder='Enter Message' 
              value={message} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)} 
            />
            <input 
              type='number' 
              className='w-full p-3 rounded-lg bg-slate-800' 
              placeholder='Enter Amount' 
              value={amount} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} 
              min={1} 
            />
            <button 
              type="button" 
              className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2" 
              onClick={() => confirmDonation()} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Pay'}
            </button>
          </div>
          <div className='flex gap-2 mt-5'>
            <button 
              className='bg-slate-800 p-3 rounded-lg' 
              onClick={() => confirmDonation(10)} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Pay 10'}
            </button>
            <button 
              className='bg-slate-800 p-3 rounded-lg' 
              onClick={() => confirmDonation(20)} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Pay 20'}
            </button>
            <button 
              className='bg-slate-800 p-3 rounded-lg' 
              onClick={() => confirmDonation(30)} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Pay 30'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
