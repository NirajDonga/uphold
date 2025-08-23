"use client"
import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
// Import your custom useAuth hook
import { useAuth } from '@/app/lib/useAuth'; 
import { usePathname, useRouter } from 'next/navigation';

const Navbar = () => {
  // Use your custom hook instead of useSession
  const { session, status, signOut } = useAuth(); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getButtonClassName = (path) => {
    const baseClasses = "block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer";
    const activeClasses = "text-blue-600 dark:text-blue-400 font-semibold";
    return `${baseClasses} ${pathname === path ? activeClasses : ''}`;
  };

  const handleNavigation = (path) => {
    router.push(path);
    setIsDropdownOpen(false);
  };

  // This handleSignOut now uses the function from your useAuth hook
  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut(); // This will handle clearing session, state, and redirection
  };

  if (status === 'loading') {
    return (
      <nav className='bg-slate-900 text-white h-24 flex items-center justify-between px-4 sm:px-8 md:px-16'>
        <div className='text-2xl font-bold'>GetMeAChai!</div>
        <div className="animate-pulse bg-gray-700 h-10 w-24 rounded"></div>
      </nav>
    );
  }

  // The session object from useAuth might have a different structure, adjust if needed
  // This assumes session.user contains the same data as before
  const username = session?.user?.username || session?.user?.name;
  const profileUrl = session?.user?.profilepic?.url || '';

  return (
    <nav className='bg-slate-900 text-white h-24 flex items-center justify-between px-4 sm:px-8 md:px-16'>
      <Script
        src="https://cdn.lordicon.com/lordicon.js"
        strategy="afterInteractive"
      />
      <Link href={"/"} className='text-2xl font-bold'>
        GetMeAChai!
      </Link>
      <div className="flex items-center gap-4">
        {/* Show sign-out status if user is signed out */}
        {status === 'unauthenticated' && !session && (
          <span className="text-red-400 font-semibold mr-2">Signed out</span>
        )}
        {/* The rest of your JSX remains the same */}
        {session ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              type="button"
              className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center cursor-pointer"
            >
              {profileUrl ? (
                <Image
                  src={profileUrl}
                  alt="Profile"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full mr-2 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full mr-2 bg-gray-400 flex items-center justify-center text-xs">
                  {username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              Welcome, {username || 'User'}
              <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="z-50 absolute right-0 mt-2 bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700">
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                  <li>
                    <button onClick={() => handleNavigation(`/${username}`)} className={getButtonClassName(`/${username}`)}>
                      Your page
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigation('/dashboard')} className={getButtonClassName('/dashboard')}>
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigation('/funds')} className={getButtonClassName('/funds')}>
                      Wallet
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Link href={"/login"}>
            <button
              type="button"
              className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center cursor-pointer"
            >
              Login
            </button>
          </Link>
        )}
      </div>
    </nav>
  )
};

export default Navbar;