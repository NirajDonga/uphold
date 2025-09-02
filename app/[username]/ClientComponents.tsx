'use client';

import dynamic from 'next/dynamic';

// Import client component with dynamic to avoid SSR issues
const UserProfileDisplay = dynamic(() => import('./UserProfileDisplay'), { ssr: false });

export function UserProfileClient({ userId }: { userId: string }) {
  return <UserProfileDisplay userId={userId} key={`profile-${userId}`} />;
}
