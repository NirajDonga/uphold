'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Password has been reset! You can now log in.', { position: 'top-right', autoClose: 5000, theme: 'dark' });
        router.push('/login');
      } else {
        toast.error(data.error || 'Failed to reset password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      }
    } catch (err) {
      toast.error('An error occurred while resetting password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center text-white">Invalid or missing token.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <form onSubmit={handleReset} className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors"
          minLength={6}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
