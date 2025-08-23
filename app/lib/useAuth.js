"use client"
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { data: session, status, update } = useSession();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.id) {
        try {
          setError(null);
          const response = await fetch('/api/profile');
          if (response.ok) {
            const { user } = await response.json();
            setUserProfile(user);
            
            // If the username in the session doesn't match the database, update the session
            if (user.username !== session.user.username) {
              console.log('Username mismatch detected, updating session...');
              await update();
            }
          } else {
            const errorData = await response.json();
            console.error('Profile fetch failed:', errorData);
            setError(errorData.error || 'Failed to fetch profile');
            
            // If user not found, sign them out
            if (response.status === 404) {
              console.log('User not found in database, signing out...');
              await signOut({ redirect: false });
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setError('Network error while fetching profile');
        } finally {
          setIsLoading(false);
        }
      } else if (status === 'unauthenticated') {
        setUserProfile(null);
        setError(null);
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      setUserProfile(null);
      setError(null);
      setIsLoading(false);
    }
  }, [session, status, update]);

  const refreshProfile = async () => {
    if (session?.user?.id) {
      try {
        setError(null);
        const response = await fetch('/api/profile');
        if (response.ok) {
          const { user } = await response.json();
          setUserProfile(user);
          
          // If the username in the session doesn't match the database, update the session
          if (user.username !== session.user.username) {
            console.log('Username mismatch detected during refresh, updating session...');
            await update();
          }
          
          return user;
        } else {
          const errorData = await response.json();
          console.error('Profile refresh failed:', errorData);
          setError(errorData.error || 'Failed to refresh profile');
          
          // If user not found, sign them out
          if (response.status === 404) {
            console.log('User not found in database during refresh, signing out...');
            await signOut({ redirect: false });
          }
          
          return null;
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error);
        setError('Network error while refreshing profile');
        return null;
      }
    }
    return null;
  };

  const handleSignOut = async () => {
    try {
      setUserProfile(null);
      setError(null);
      setIsLoading(false);
      // Redirect to home page after sign out
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      setError('Failed to sign out');
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    session,
    status,
    userProfile,
    isLoading,
    error,
    update,
    refreshProfile,
    signOut: handleSignOut,
    clearError,
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    isPending: status === 'loading' || isLoading,
  };
};
