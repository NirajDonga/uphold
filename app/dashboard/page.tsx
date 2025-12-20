"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/lib/useAuth';
import type { ReactElement, FormEvent, ChangeEvent } from 'react';

interface FormData {
  name: string;
  username: string;
  bio: string;
  profilePicture: File | null;
  coverPicture: File | null;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

declare global {
  interface Window {
    usernameCheckTimeout?: NodeJS.Timeout;
  }
}

interface Preview {
  profile: string;
  cover: string;
}

interface SelectedNames {
  profile: string;
  cover: string;
}

const Dashboard = (): ReactElement => {
  const { session, userProfile, isPending, update, refreshProfile, signOut, error, clearError } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    username: '',
    bio: '',
    profilePicture: null,
    coverPicture: null,
  });
  const [preview, setPreview] = useState<Preview>({ profile: '', cover: '' });
  const [selectedNames, setSelectedNames] = useState<SelectedNames>({ profile: '', cover: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [isReAuthenticated, setIsReAuthenticated] = useState<boolean>(false);
  const [reAuthTimeRemaining, setReAuthTimeRemaining] = useState<number>(0);
  const [sessionProvider, setSessionProvider] = useState<string>('credentials');

  // Username availability check
  const checkUsernameAvailability = useCallback(async (username: string): Promise<void> => {
    if (!username || username.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    // Skip check if username is the same as current user's username
    if (userProfile && userProfile.username === username) {
      setUsernameAvailable(true);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(`/api/users?action=check-username&username=${username}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [userProfile]);

  // Check re-authentication status for OAuth users
  const checkReAuthStatus = useCallback(async (): Promise<void> => {
    // If logged in via credentials (password), don't need OAuth re-auth
    if (sessionProvider === 'credentials') {
      setIsReAuthenticated(true);
      return;
    }

    // OAuth session - check if re-authenticated recently
    try {
      const response = await fetch('/api/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setIsReAuthenticated(data.data.recentlyAuthenticated);
        setReAuthTimeRemaining(data.data.timeRemaining || 0);
      }
    } catch (error) {
      console.error('Error checking re-auth status:', error);
      setIsReAuthenticated(false);
    }
  }, [sessionProvider]);

  // Set form data when userProfile is loaded
  useEffect(() => {
    console.log("userProfile updated:", userProfile);
    
    if (userProfile) {
      // Check if user has a password
      setHasPassword(!!userProfile.password);
      
      // Track current session provider (how they logged in THIS time)
      const currentProvider = (session?.user as any)?.provider || userProfile.provider || 'credentials';
      setSessionProvider(currentProvider);
      
      // Set basic form data safely
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || '',
        username: userProfile.username || '',
        bio: userProfile.bio || '',
      }));
      
      // Handle profile and cover images safely
      try {
        // Create a safe local copy
        const userObj = userProfile;
        
        // Simple null checks for profile image
        const profileUrl = userObj?.profilepic?.url;
        if (profileUrl) {
          console.log("Setting profile preview to:", profileUrl);
          setPreview(prev => ({ ...prev, profile: profileUrl }));
        }
        
        // Simple null checks for cover image
        const coverUrl = userObj?.coverpic?.url;
        if (coverUrl) {
          console.log("Setting cover preview to:", coverUrl);
          setPreview(prev => ({ ...prev, cover: coverUrl }));
        }
      } catch (err) {
        console.error("Error setting preview images:", err);
      }
    }
  }, [userProfile, session]);

  // Check re-authentication status when sessionProvider changes
  useEffect(() => {
    checkReAuthStatus();
  }, [sessionProvider, checkReAuthStatus]);

  // Check if user just returned from re-authentication
  useEffect(() => {
    const pendingPasswordSet = sessionStorage.getItem('pendingPasswordSet');
    if (pendingPasswordSet === 'true' && session) {
      sessionStorage.removeItem('pendingPasswordSet');
      // Re-check auth status
      checkReAuthStatus();
      toast.success('Re-authentication successful! You can now set your password.', {
        position: 'top-right',
        autoClose: 5000,
        theme: 'dark',
      });
    }
  }, [session, checkReAuthStatus]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error, {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
      clearError();
    }
  }, [error, clearError]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Handle username validation with debounce
    if (name === 'username') {
      // Debounce username check
      if (window.usernameCheckTimeout) {
        clearTimeout(window.usernameCheckTimeout);
      }
      window.usernameCheckTimeout = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
    setFormData((prev) => ({ ...prev, [name]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview((p) => ({ ...p, [name === 'profilePicture' ? 'profile' : 'cover']: url }));
      setSelectedNames((s) => ({ ...s, [name === 'profilePicture' ? 'profile' : 'cover']: file.name }));
    }
  };

  // Image removal functionality has been removed since users are required to have images

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Check if username is available before submitting
    if (formData.username && formData.username !== userProfile?.username && usernameAvailable === false) {
      toast.error('Username is already taken. Please choose another one.', {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
      return;
    }
    
    setLoading(true);
    try {
      const fd = new FormData();
      if (formData.name) fd.append('name', formData.name);
      if (formData.username) fd.append('username', formData.username);
      if (formData.bio) fd.append('bio', formData.bio);
      if (formData.profilePicture) fd.append('profilePicture', formData.profilePicture);
      if (formData.coverPicture) fd.append('coverPicture', formData.coverPicture);
      
      const res = await fetch('/api/profile', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        console.log("Profile update response:", data);
        
        toast.success('Profile updated successfully!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        
        // Safely extract user from response
        const user = data.data?.user || data.user;
        
        // Update preview images with new URLs from database - with proper null checks
        if (user && typeof user === 'object') {
          // Handle profile image
          if (user.profilepic && typeof user.profilepic === 'object' && user.profilepic.url) {
            console.log("Updating profile preview to:", user.profilepic.url);
            setPreview(prev => ({ ...prev, profile: user.profilepic.url }));
          }
          
          // Handle cover image
          if (user.coverpic && typeof user.coverpic === 'object' && user.coverpic.url) {
            console.log("Updating cover preview to:", user.coverpic.url);
            setPreview(prev => ({ ...prev, cover: user.coverpic.url }));
          }
        }
        
        // Update the session to reflect changes
        await update();
        
        // Refresh the profile data
        await refreshProfile();
        
        // Reset file inputs but keep the data
        setFormData(prev => ({ ...prev, profilePicture: null, coverPicture: null }));
        setSelectedNames({ profile: '', cover: '' });
      } else {
        // Try to get a structured error message
        const err = await res.text();
        toast.error(err || 'Failed to update profile', {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'An error occurred while updating profile', {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    // Validate inputs
    if (!formData.newPassword) {
      toast.error('Please enter a new password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      return;
    }
    
    // If logged in via credentials, require current password
    if (sessionProvider === 'credentials' && hasPassword && !formData.currentPassword) {
      toast.error('Please enter your current password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      return;
    }
    
    // Validate password confirmation
    if (formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      return;
    }
    
    // OAuth session requires recent re-authentication
    if (sessionProvider !== 'credentials' && !isReAuthenticated) {
      toast.error('Please re-authenticate before setting/changing your password', { 
        position: 'top-right', 
        autoClose: 5000, 
        theme: 'dark' 
      });
      return;
    }
    
    setLoading(true);
    try {
      const requestBody: any = {
        changePassword: true,
        newPassword: formData.newPassword,
      };
      
      // Include current password only if logged in via credentials
      if (sessionProvider === 'credentials' && hasPassword) {
        requestBody.currentPassword = formData.currentPassword;
      }
      
      // Always include confirmation
      requestBody.confirmPassword = formData.confirmPassword;
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || 'Password updated successfully!', { position: 'top-right', autoClose: 5000, theme: 'dark' });
        setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        // Update hasPassword status since user now has a password
        setHasPassword(true);
        setIsReAuthenticated(true);
      } else if (data.data?.requiresReAuth) {
        toast.error('Your session has expired. Please re-authenticate.', { 
          position: 'top-right', 
          autoClose: 5000, 
          theme: 'dark' 
        });
        setIsReAuthenticated(false);
      } else {
        toast.error(data.error || 'Failed to update password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      }
    } catch (err) {
      toast.error('An error occurred while updating password', { position: 'top-right', autoClose: 5000, theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  const handleReAuthenticate = async (): Promise<void> => {
    setLoading(true);
    try {
      // Use current session provider (how they logged in this time)
      const provider = sessionProvider || 'google';
      const callbackUrl = encodeURIComponent('/dashboard');
      
      // Store intent to set/change password
      sessionStorage.setItem('pendingPasswordSet', 'true');
      
      // Redirect to OAuth provider with prompt for re-auth
      if (provider === 'google') {
        window.location.href = `/api/auth/signin/google?callbackUrl=${callbackUrl}&prompt=consent`;
      } else if (provider === 'github') {
        window.location.href = `/api/auth/signin/github?callbackUrl=${callbackUrl}`;
      } else {
        toast.error('Re-authentication not available for this provider', { 
          position: 'top-right', 
          autoClose: 5000, 
          theme: 'dark' 
        });
        setLoading(false);
      }
    } catch (err) {
      toast.error('Failed to initiate re-authentication', { position: 'top-right', autoClose: 5000, theme: 'dark' });
      setLoading(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      console.log('Dashboard: Starting sign out process...');
      
      // Call the useAuth signOut function
      await signOut();
      
      console.log('Dashboard: Sign out completed successfully');
      
    } catch (error) {
      console.error('Dashboard: Sign out error:', error);
      toast.error('Failed to sign out', {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
      
      // Try manual redirect as fallback
      try {
        console.log('Dashboard: Attempting manual redirect...');
        window.location.href = '/login';
      } catch (redirectError) {
        console.error('Dashboard: Manual redirect failed:', redirectError);
      }
    }
  };

  // Show loading while checking authentication
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-white">
        <div className="text-center">
          <p className="text-lg">Not authenticated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Name</label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Username</label>
            <div className="relative">
              <input 
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full bg-transparent border-b-2 ${
                  usernameAvailable === true 
                    ? 'border-green-500' 
                    : usernameAvailable === false 
                    ? 'border-red-500' 
                    : 'border-gray-600'
                } text-white py-2 focus:outline-none focus:border-white transition-colors`}
                placeholder="Choose a username"
              />
              {isCheckingUsername && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
              {!isCheckingUsername && formData.username && usernameAvailable === true && (
                <div className="absolute right-2 top-2 text-green-500">
                  ✓ Available
                </div>
              )}
              {!isCheckingUsername && formData.username && usernameAvailable === false && (
                <div className="absolute right-2 top-2 text-red-500">
                  ✗ Taken
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Username can only contain letters, numbers, underscores (_), and dots (.)
            </p>
          </div>

          {/* Password Change/Set Section - Available for all users */}
          <div className="border-t border-gray-700 pt-6">
            <label className="block text-gray-400 text-sm font-medium mb-3">
              {hasPassword ? 'Change Password' : 'Set Password'}
            </label>
            
            {sessionProvider !== 'credentials' && (
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                <p className="text-sm text-blue-300 mb-2">
                  🔐 You're logged in via <strong>{sessionProvider}</strong>. 
                  {hasPassword 
                    ? ' To change your password, you need to re-authenticate for security.'
                    : ' Set a password to enable password-based login.'
                  }
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  For security, you need to re-authenticate before {hasPassword ? 'changing' : 'setting'} a password.
                </p>
                
                {!isReAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleReAuthenticate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                    disabled={loading}
                  >
                    🔄 Re-authenticate with {sessionProvider}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span>✓ Authenticated</span>
                    {reAuthTimeRemaining > 0 && (
                      <span className="text-gray-400">
                        ({Math.floor(reAuthTimeRemaining / 60)}:{(reAuthTimeRemaining % 60).toString().padStart(2, '0')} remaining)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {sessionProvider === 'credentials' && hasPassword && (
              <input
                type="password"
                name="currentPassword"
                placeholder="Current Password"
                value={formData.currentPassword || ''}
                onChange={handleInputChange}
                className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors mb-2"
              />
            )}
            
            {(sessionProvider === 'credentials' || isReAuthenticated) && (
              <>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="New Password (min 6 characters)"
                  value={formData.newPassword || ''}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors mb-2"
                />
                
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword || ''}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors mb-2"
                />
                
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  disabled={loading || (sessionProvider !== 'credentials' && !isReAuthenticated)}
                >
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </button>
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Bio</label>
            <textarea 
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
              maxLength={500}
              placeholder="Tell us about yourself..."
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-white transition-colors resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.bio.length}/500
            </div>  
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Profile Picture</label>
            {preview.profile && (
              <div className="mb-2">
                <Image src={preview.profile} alt="profile preview" className="w-full h-40 object-cover rounded mb-2" width={400} height={160} />
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <label htmlFor="profile-input" className="inline-block bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors">
                Choose file
              </label>
              <span className="text-sm text-gray-300 truncate max-w-[60%]">{selectedNames.profile || 'No file chosen'}</span>
            </div>
            <input 
              id="profile-input"
              type="file"
              accept="image/*"
              name="profilePicture"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Cover Picture</label>
            {preview.cover && (
              <div className="mb-2">
                <Image src={preview.cover} alt="cover preview" className="w-full h-40 object-cover rounded mb-2" width={800} height={160} />
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <label htmlFor="cover-input" className="inline-block bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors">
                Choose file
              </label>
              <span className="text-sm text-gray-300 truncate max-w-[60%]">{selectedNames.cover || 'No file chosen'}</span>
            </div>
            <input 
              id="cover-input"
              type="file"
              accept="image/*"
              name="coverPicture"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
