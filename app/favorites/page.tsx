"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/lib/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';

interface Creator {
  _id: string;
  username: string;
  name?: string;
  profilepic?: {
    url: string;
  };
  bio?: string;
}

export default function FavoritesPage() {
  const { session, status } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status !== 'loading' && session) {
      fetchFavorites();
    }
  }, [status, session, router]);
  
  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/favorites');
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      
      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load your favorite creators');
    } finally {
      setLoading(false);
    }
  };
  
  const removeFavorite = async (creatorId: string) => {
    try {
      const response = await fetch('/api/users/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creatorId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove from favorites');
      }
      
      // Update UI by removing the creator from the list
      setFavorites(currentFavorites => 
        currentFavorites.filter(creator => creator._id !== creatorId)
      );
      
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove from favorites');
      console.error('Error removing favorite:', error);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Loading your favorites...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">My Favorite Creators</h1>
        
        {favorites.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-300">You haven&apos;t added any creators to your favorites yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {favorites.map(creator => (
              <div key={creator._id} className="bg-gray-800 p-4 rounded-lg flex">
                <Link href={`/${creator.username}`} className="flex-1 flex items-center">
                  <div className="flex-shrink-0 w-16 h-16 mr-4">
                    {creator.profilepic?.url ? (
                      <Image
                        src={creator.profilepic.url}
                        alt={creator.username}
                        width={64}
                        height={64}
                        className="rounded-full object-cover w-16 h-16"
                      />
                    ) : (
                      <div className="bg-gray-600 rounded-full w-16 h-16 flex items-center justify-center text-2xl">
                        {(creator.name || creator.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white">{creator.name || creator.username}</h2>
                    <p className="text-blue-400">@{creator.username}</p>
                    {creator.bio && (
                      <p className="text-gray-300 text-sm mt-1 line-clamp-2">{creator.bio}</p>
                    )}
                  </div>
                </Link>
                
                <button 
                  onClick={() => removeFavorite(creator._id)}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 self-start"
                  aria-label="Remove from favorites"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
