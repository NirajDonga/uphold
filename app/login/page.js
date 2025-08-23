"use client"
import React, { useEffect, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  // Show loading while checking authentication status
  if (status === 'loading' || isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-white">
          {isRedirecting ? 'Redirecting...' : 'Loading...'}
        </h1>
      </div>
    );
  }

  // If already authenticated, don't show login form
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold text-white">Already logged in!</h1>
        <p className="text-gray-400 mt-2">Redirecting to dashboard...</p>
      </div>
    );
  }

  const handleGithubSignIn = async () => {
    await signIn('github', { callbackUrl: '/dashboard' });
  };

  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <div className="w-full max-w-xs">
        <h1 className="text-4xl font-bold mb-8 text-white">
          Login to get started
        </h1>
        <div className="flex flex-col gap-3">
          <button 
            className="flex items-center justify-center text-white hover:text-black border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="h-6 w-6 mr-2" />
            <span>Continue with Google</span>
          </button>
          <button 
            onClick={handleGithubSignIn}
            className="flex items-center justify-center text-white hover:text-black border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <FaGithub className="h-6 w-6 mr-2" />
            <span>Continue with Github</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
