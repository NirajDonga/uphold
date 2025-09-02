"use client"
import { useSession, signOut } from 'next-auth/react';
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { Session } from 'next-auth';
import type { UserDocument } from '@/types';
import { logger } from './logger';

interface ProfileResponse {
  user: UserDocument;
}

interface AuthError extends Error {
  info?: any;
  status?: number;
}

interface UseAuthReturn {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  userProfile: UserDocument | undefined;
  isLoading: boolean;
  error: string | null;
  update: () => Promise<Session | null>;
  refreshProfile: () => Promise<UserDocument | null>;
  updateSession: (updatedUserData: UserDocument) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  isUnauthenticated: boolean;
  isPending: boolean;
}

// Fetcher function for SWR with proper typing
const fetcher = async (url: string): Promise<ProfileResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    const error: AuthError = new Error('An error occurred while fetching the data.');
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const useAuth = (): UseAuthReturn => {
  const { data: session, status, update } = useSession();
  const [error, setError] = useState<string | null>(null);

  // Use SWR for profile data fetching with automatic revalidation
  const { data: profileData, error: profileError, mutate: mutateProfile, isLoading } = useSWR<ProfileResponse>(
    session?.user?.id ? '/api/profile' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      onError: (error: AuthError) => {
        console.error('Profile fetch error:', error);
        if (error.status === 404) {
          console.log('User not found in database, signing out...');
          handleSignOut();
        }
      }
    }
  );

  const userProfile = profileData?.user;

  // Log user profile data whenever it changes
  if (userProfile) {
    logger.profile(userProfile);
  }

  // Optimized refresh function using SWR mutate with forced revalidation
  const refreshProfile = useCallback(async (): Promise<UserDocument | null> => {
    try {
      setError(null);
      // Force a complete revalidation - don't use cache
      const updatedData = await mutateProfile(
        // First param is undefined to avoid providing stale data
        undefined,
        // Second param forces revalidation from the server
        { 
          revalidate: true,
          populateCache: true,
          rollbackOnError: false,
        }
      );
      
      // Update session to ensure everything is in sync
      logger.info('Refreshing profile and session after data change...');
      await update();
      
      // Log the refreshed profile
      if (updatedData?.user) {
        logger.profile(updatedData.user);
      } else {
        logger.warn('No user data returned after profile refresh');
      }
      
      return updatedData?.user || null;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setError('Network error while refreshing profile');
      return null;
    }
  }, [mutateProfile, update]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      // Clear SWR cache
      await mutateProfile(undefined, false);
      // NextAuth handles cookie clearing automatically
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      setError('Failed to sign out');
    }
  }, [mutateProfile]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Update session when profile data changes
  const updateSession = useCallback(async (updatedUserData: UserDocument): Promise<void> => {
    if (updatedUserData && session?.user) {
      // Optimistically update local data
      await mutateProfile({ user: updatedUserData }, false);
      
      // Update NextAuth session
      await update();
      
      // Revalidate to ensure consistency
      await mutateProfile();
    }
  }, [mutateProfile, update, session?.user]);

  return {
    session,
    status,
    userProfile,
    isLoading: status === 'loading' || isLoading,
    error: error || (profileError as AuthError)?.info?.error,
    update,
    refreshProfile,
    updateSession,
    signOut: handleSignOut,
    clearError,
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    isPending: status === 'loading' || isLoading,
  };
};
