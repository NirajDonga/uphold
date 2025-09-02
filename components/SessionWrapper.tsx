"use client"
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import type { ReactNode } from "react";

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Loading...</p>
      </div>
    </div>
  );
}

interface SessionWrapperProps {
  children: ReactNode;
}

export default function SessionWrapper({ children }: SessionWrapperProps) {
  return (
    <SessionProvider
      refetchInterval={60} // Reduce refresh frequency to 60 seconds to improve performance
      refetchOnWindowFocus={false} // Disable refresh on window focus to reduce unnecessary requests
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </SessionProvider>
  );
}
