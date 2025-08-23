"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/lib/useAuth';
import { signOut as nextAuthSignOut } from 'next-auth/react';

const Dashboard = () => {
  const { session, userProfile, isPending, update, refreshProfile, signOut, error, clearError, isAuthenticated, status } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    profilePicture: null,
    coverPicture: null,
  });
  const [preview, setPreview] = useState({ profile: '', cover: '' });
  const [selectedNames, setSelectedNames] = useState({ profile: '', cover: '' });
  const [loading, setLoading] = useState(false);
  const [removingImage, setRemovingImage] = useState({ profile: false, cover: false });

  // Set form data when userProfile is loaded
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || '',
        username: userProfile.username || '',
        bio: userProfile.bio || '',
      }));
      
      // Set preview images if they exist
      if (userProfile.profilepic?.url) {
        setPreview(prev => ({ ...prev, profile: userProfile.profilepic.url }));
      }
      if (userProfile.coverpic?.url) {
        setPreview(prev => ({ ...prev, cover: userProfile.coverpic.url }));
      }
    }
  }, [userProfile]);

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
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
    setFormData((prev) => ({ ...prev, [name]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview((p) => ({ ...p, [name === 'profilePicture' ? 'profile' : 'cover']: url }));
      setSelectedNames((s) => ({ ...s, [name === 'profilePicture' ? 'profile' : 'cover']: file.name }));
    }
  };

  const handleRemoveImage = async (imageType) => {
    if (!userProfile) return;
    
    const isProfile = imageType === 'profile';
    const currentImage = isProfile ? userProfile.profilepic : userProfile.coverpic;
    
    if (!currentImage?.url) {
      toast.info(`${isProfile ? 'Profile' : 'Cover'} image is already removed`, {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    try {
      setRemovingImage(prev => ({ ...prev, [imageType]: true }));
      
      const response = await fetch('/api/profile/remove-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageType,
          publicId: currentImage.public_id 
        })
      });

      if (response.ok) {
        const { user } = await response.json();
        
        // Update preview and form data
        if (isProfile) {
          setPreview(prev => ({ ...prev, profile: '' }));
          setFormData(prev => ({ ...prev, profilePicture: null }));
        } else {
          setPreview(prev => ({ ...prev, cover: '' }));
          setFormData(prev => ({ ...prev, coverPicture: null }));
        }
        
        // Update session
        await update({
          profilepic: user.profilepic,
          coverpic: user.coverpic,
        });
        
        // Refresh profile
        await refreshProfile();
        
        toast.success(`${isProfile ? 'Profile' : 'Cover'} image removed successfully!`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to remove ${isProfile ? 'profile' : 'cover'} image`, {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } catch (error) {
      console.error('Remove image error:', error);
      toast.error(`Failed to remove ${isProfile ? 'profile' : 'cover'} image`, {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
      setRemovingImage(prev => ({ ...prev, [imageType]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        const { user } = await res.json();
        toast.success('Profile updated successfully!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        
        // Update preview images with new URLs from database
        if (user.profilepic?.url) {
          setPreview(prev => ({ ...prev, profile: user.profilepic.url }));
        }
        if (user.coverpic?.url) {
          setPreview(prev => ({ ...prev, cover: user.coverpic.url }));
        }
        
        // Update the session to reflect changes
        await update({
          name: user.name,
          username: user.username,
          profilepic: user.profilepic,
          coverpic: user.coverpic,
        });
        
        // Refresh the profile data
        await refreshProfile();
        
        // Reset file inputs but keep the data
        setFormData(prev => ({ ...prev, profilePicture: null, coverPicture: null }));
        setSelectedNames({ profile: '', cover: '' });
      } else {
        const err = await res.text();
        toast.error(err || 'Failed to update profile', {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      }
    } catch (error) {
      toast.error('An error occurred while updating profile', {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
          <div className="flex items-center gap-4">
            {/* Debug info */}
            <div className="text-xs text-gray-400">
              Status: {status} | Auth: {isAuthenticated ? 'Yes' : 'No'}
            </div>
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
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Username</label>
            <input 
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <div className="text-xs text-gray-500 mt-1">
              Only letters, numbers, underscores (_), and dots (.) allowed. Minimum 2 characters, maximum 30. Username will be stored in lowercase for uniqueness.
            </div>
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
              className="w-full bg-transparent border-b-2 border-gray-600 text-white py-2 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.bio.length}/500
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Profile Picture</label>
            {preview.profile && (
              <div className="relative mb-2">
                <img src={preview.profile} alt="profile preview" className="w-full h-40 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('profile')}
                  disabled={removingImage.profile}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {removingImage.profile ? 'Removing...' : 'Remove'}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label htmlFor="profile-input" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors">
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
              <div className="relative mb-2">
                <img src={preview.cover} alt="cover preview" className="w-full h-40 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('cover')}
                  disabled={removingImage.cover}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {removingImage.cover ? 'Removing...' : 'Remove'}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label htmlFor="cover-input" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors">
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

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
