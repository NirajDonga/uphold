'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

interface FavoriteButtonProps {
  creatorId: string;
}

export default function FavoriteButton({ creatorId }: FavoriteButtonProps) {
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if this creator is in the user's favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!session || !session.user) return;
      
      try {
        const response = await fetch('/api/users/favorites');
        if (response.ok) {
          const data = await response.json();
          const favorites = data.favorites || [];
          setIsFavorite(favorites.some((fav: any) => fav._id === creatorId));
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [creatorId, session]);

  const toggleFavorite = async () => {
    if (!session || !session.user) {
      // Redirect to login or show a message
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);

    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch('/api/users/favorites', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creatorId }),
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
      } else {
        console.error('Failed to update favorites');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the button if viewing your own profile
  if (session?.user?.id === creatorId) {
    return null;
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`flex items-center gap-1 px-3 py-2 rounded-full transition-all ${
        isFavorite 
          ? 'bg-pink-700 hover:bg-pink-800' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? (
        <>
          <FaHeart className="text-pink-400" />
          <span>Favorited</span>
        </>
      ) : (
        <>
          <FaRegHeart />
          <span>Favorite</span>
        </>
      )}
    </button>
  );
}
