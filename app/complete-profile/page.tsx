"use client"
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { ReactElement, FormEvent, ChangeEvent } from 'react';

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
}

declare global {
  interface Window {
    usernameCheckTimeout?: NodeJS.Timeout;
  }
}

const CompleteProfile = (): ReactElement => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (status === 'loading') {
      return undefined;
    }
    
    if (status === 'unauthenticated' || !session) {
      const checkSessionTimer = setTimeout(() => {
        router.push('/login');
      }, 3000);
      
      return () => clearTimeout(checkSessionTimer);
    }

    if ((session?.user as any).isProfileComplete) {
      router.push('/dashboard');
      return undefined;
    }
    
    const checkProfileStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-profile');
        if (response.ok) {
          const data = await response.json();
          
          if (data.hasPassword) {
            try {
              if (!session?.user?.id) {
                return;
              }
              
              const updateResponse = await fetch('/api/users/complete-profile', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: session.user.id,
                  username: data.username,
                  password: 'KEEP_EXISTING_PASSWORD'
                }),
              });
              
              if (updateResponse.ok) {
                await update();
                router.push('/dashboard');
              }
            } catch (updateError) {
              console.error('Failed to update profile:', updateError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check profile:', error);
      }
    };
    
    checkProfileStatus();
    return undefined;
  }, [session, status, router, update]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-white">Loading...</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold text-white">Not authenticated</h1>
      </div>
    );
  }

  if (session?.user && (session.user as any).isProfileComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold text-white">Profile already complete</h1>
      </div>
    );
  }

  const checkUsernameAvailability = async (username: string): Promise<void> => {
    if (!username || username.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(`/api/users?action=check-username&username=${username}`);
      
      if (!response.ok && response.status >= 500) {
        setUsernameAvailable(true);
        return;
      }
      
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      setUsernameAvailable(true);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setFormData({
      ...formData,
      username: value
    });
    
    if (window.usernameCheckTimeout) {
      clearTimeout(window.usernameCheckTimeout);
    }
    window.usernameCheckTimeout = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!session || !session.user) {
      toast.error('You must be signed in to complete your profile');
      router.push('/login');
      return;
    }
    
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (usernameAvailable === false) {
      toast.error('Please choose an available username');
      return;
    }
    
    if (usernameAvailable === null && formData.username.length >= 2) {
      try {
        setIsSubmitting(true);
        await checkUsernameAvailability(formData.username);
        if (usernameAvailable === false) {
          toast.error('Please choose an available username');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        // Continue with submission even if username check fails
      }
    }

    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        toast.error('Session expired or invalid. Please sign in again.');
        router.push('/login');
        setIsSubmitting(false);
        return;
      }
      
      const response = await fetch('/api/users/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile completed successfully!');
        await update();
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Failed to complete profile');
      }
    } catch (error) {
      toast.error('Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Complete Your Profile</h1>
          <p className="text-gray-400">
            Welcome! Please complete your profile to continue.
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="Choose a unique username"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={2}
                maxLength={30}
              />
              {formData.username && (
                <div className="mt-2 text-sm">
                  {isCheckingUsername ? (
                    <span className="text-yellow-400">Checking availability...</span>
                  ) : usernameAvailable === true ? (
                    <span className="text-green-400">✓ Username available</span>
                  ) : usernameAvailable === false ? (
                    <span className="text-red-400">✗ Username taken</span>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 text-left">
                Username cannot be changed after completion
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Set a password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1 text-left">
                Minimum 6 characters
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || usernameAvailable === false}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
            </button>
            {usernameAvailable === false && (
              <p className="text-xs text-red-400 mt-2">
                Please choose a different username to continue
              </p>
            )}
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            You&apos;re signing in with {(session.user as any).provider === 'github' ? 'GitHub' : 'Google'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
