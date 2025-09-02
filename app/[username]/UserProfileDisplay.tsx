'use client';

import React from 'react';
import FavoriteButton from './FavoriteButton';

interface UserProfileDisplayProps {
  userId: string;
}

export default function UserProfileDisplay({ userId }: UserProfileDisplayProps) {
  return (
    <div className="flex gap-2">
      <FavoriteButton creatorId={userId} />
    </div>
  );
}
