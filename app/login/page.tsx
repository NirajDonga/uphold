"use client"
import React, { useEffect, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { ReactElement } from 'react';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  name: string;
}

const Login = (): ReactElement => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  
  // Form states
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    name: ''
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsRedirecting(true);
      // Always redirect to the dashboard after login
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
        <p className="text-gray-300 mt-2">Redirecting to your profile...</p>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset username availability when username changes
    if (name === 'username') {
      setUsernameAvailable(null);
    }
  };

  const checkUsernameAvailability = async (): Promise<void> => {
    if (!formData.username || formData.username.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      // Use the correct API endpoint format - GET request with query parameters
      const response = await fetch(`/api/users?action=check-username&username=${encodeURIComponent(formData.username)}`);
      
      // If we can't connect to API, assume username is available (will be checked again on form submission)
      if (!response.ok) {
        console.warn('Username check failed with status:', response.status);
        // For server errors, assume available to avoid blocking registration
        if (response.status >= 500) {
          setUsernameAvailable(true);
        } else {
          setUsernameAvailable(null);
        }
        return;
      }
      
      const data = await response.json();
      console.log('Username availability:', data);
      setUsernameAvailable(data.available);
    } catch (error) {
      console.error('Username check error:', error);
      // If we can't check, assume available and let server validation catch duplicates
      setUsernameAvailable(true); 
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    // Only show error when username is definitely not available (false)
    // If null or true, allow submission
    if (usernameAvailable === false) {
      toast.error('Please choose an available username');
      return;
    }

    setIsRegistering(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: formData.email.toLowerCase(),
          password: formData.password,
          username: formData.username.toLowerCase(),
          name: formData.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Account created successfully!');
      
      // Auto-login after successful registration
      const signInResult = await signIn('credentials', {
        email: formData.email.toLowerCase(),
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // Need to get the username to redirect to their profile page
        try {
          const userResponse = await fetch('/api/profile');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user?.username) {
              router.replace(`/${userData.user.username}`);
            } else {
              router.replace('/dashboard');
            }
          } else {
            // Fallback to dashboard if we can't get the username
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          router.replace('/dashboard'); // Fallback
        }
      } else {
        router.replace('/login');
      }

    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate input
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    console.log('Login: Attempting login with email:', formData.email);
    
    try {
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase(),
        password: formData.password,
        redirect: false,
        callbackUrl: '/dashboard' // Default callback URL
      });

      console.log('Login: SignIn result:', JSON.stringify({
        ok: result?.ok,
        error: result?.error,
        status: result?.status,
        url: result?.url
      }));

      if (result?.ok) {
        toast.success('Login successful!');
        
        // Need to get the username to redirect to their profile page
        try {
          console.log('Login: Fetching user profile for redirect');
          const userResponse = await fetch('/api/profile');
          
          if (!userResponse.ok) {
            console.error('Login: Error fetching profile, status:', userResponse.status);
            router.replace('/dashboard');
            return;
          }
          
          // Always redirect to dashboard after login
          console.log('Login: Redirecting to dashboard');
          router.replace('/dashboard');
        } catch (error) {
          console.error('Login: Error fetching user profile:', error);
          router.replace('/dashboard');
        }
      } else {
        console.error('Login: Authentication failed:', result?.error);
        
        // Show more descriptive error messages
        if (result?.error === 'CredentialsSignin') {
          toast.error('Invalid email or password');
        } else {
          toast.error(`Login failed: ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Login: Unexpected error during login:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleSocialLogin = async (provider: string): Promise<void> => {
    try {
      // We'll let the middleware handle the redirect to the user's profile page
      // based on their username after authentication
      await signIn(provider);
    } catch (error) {
      toast.error(`${provider} login failed`);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'requestPasswordReset',
          email: formData.email 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Password reset email sent! Check your inbox.');
      } else {
        toast.error(data.error || 'Failed to send password reset email');
      }
    } catch (error) {
      toast.error('An error occurred while sending password reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-white hover:text-gray-300 underline transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 space-y-6">
          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-white hover:bg-gray-700"
            >
              <FcGoogle className="h-5 w-5" />
              <span className="ml-2">Google</span>
            </button>
            <button
              onClick={() => handleSocialLogin('github')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-white hover:bg-gray-700"
            >
              <FaGithub className="h-5 w-5" />
              <span className="ml-2">GitHub</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Email/Password form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white rounded-md bg-gray-800 focus:outline-none focus:ring-gray-500 focus:border-gray-500 transition-colors"
                placeholder="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={formData.password}
                onChange={handleInputChange}
                className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white rounded-md bg-gray-800 focus:outline-none focus:ring-gray-500 focus:border-gray-500 transition-colors"
                placeholder="Password"
              />
              {isLogin && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white rounded-md bg-gray-800 focus:outline-none focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Confirm Password"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="sr-only">Username</label>
                  <div className="relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      onBlur={checkUsernameAvailability}
                      className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white rounded-md bg-gray-800 focus:outline-none focus:ring-gray-500 focus:border-gray-500 transition-colors"
                      placeholder="Username"
                    />
                    {isCheckingUsername && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="mt-1 text-sm text-red-400">Username is taken</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="mt-1 text-sm text-green-400">Username is available</p>
                  )}
                  {/* Only show this when a username is entered but not yet checked */}
                  {formData.username && formData.username.length >= 2 && usernameAvailable === null && !isCheckingUsername && (
                    <p className="mt-1 text-sm text-gray-400">Enter a unique username</p>
                  )}
                </div>

                <div>
                  <label htmlFor="name" className="sr-only">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white rounded-md bg-gray-800 focus:outline-none focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Full Name (optional)"
                  />
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={isRegistering || (!isLogin && (isCheckingUsername || usernameAvailable === false))}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isRegistering ? 'Creating Account...' : (isLogin ? 'Sign in' : 'Create Account')}
                {!isLogin && usernameAvailable === false && (
                  <span className="absolute -bottom-5 text-xs text-red-400">Username already taken</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
