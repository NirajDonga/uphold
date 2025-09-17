"use client"
import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/app/lib/useAuth'; 
import { usePathname, useRouter } from 'next/navigation';

interface UserSuggestion {
  id: string;
  username: string;
  name: string;
  profilepic: string | null;
}

const Navbar = () => {
  const { session, status, signOut } = useAuth(); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      // Search click handling is now in a separate effect
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getButtonClassName = (path: string) => {
    const baseClasses = "block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer";
    const activeClasses = "text-blue-600 dark:text-blue-400 font-semibold";
    return `${baseClasses} ${pathname === path ? activeClasses : ''}`;
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsDropdownOpen(false);
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 0) {
        setIsLoading(true);
        try {
          // Cache key for this specific search query
          const cacheKey = `search_${searchQuery.trim()}`;
          
          // Try to get from cache first
          if (typeof window !== 'undefined') {
            const cachedResults = sessionStorage.getItem(cacheKey);
            const expiryStr = sessionStorage.getItem(`${cacheKey}_expiry`);
            const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
            
            // Check if we have valid cached results
            if (cachedResults && expiry > Date.now()) {
              setSuggestions(JSON.parse(cachedResults));
              setIsLoading(false);
              return;
            }
          }
          
          // If not in cache or expired, fetch from API
          const response = await fetch(`/api/users/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data.suggestions || []);
            
            // Cache the results for 5 minutes
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify(data.suggestions || []));
                
                // Set cache expiry (5 minutes)
                const expiry = Date.now() + (5 * 60 * 1000);
                sessionStorage.setItem(`${cacheKey}_expiry`, expiry.toString());
              } catch (err) {
                // Handle potential quota exceeded errors silently
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    };
    
    // Increased debounce timeout to reduce API calls
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Keep the search dropdown open when clicking inside it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Don't navigate to search page, just show suggestions
    // Keep the search input open so user can see and select from suggestions
  };
  
  const handleSelectSuggestion = (username: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    router.push(`/${username}`);
  };

  if (status === 'loading') {
    return (
      <nav className='bg-slate-900 text-white h-24 flex items-center justify-between px-4 sm:px-8 md:px-16'>
  <div className='text-2xl font-bold'>Uphold</div>
        <div className="animate-pulse bg-gray-700 h-10 w-24 rounded"></div>
      </nav>
    );
  }

  // Always use username for display, never fallback to name
  const username = session?.user?.username || '';
  const profileUrl = session?.user?.profilePic || '';

  return (
    <nav className='bg-slate-900 text-white h-24 flex items-center justify-between px-4 sm:px-8 md:px-16'>
      <Script
        src="https://cdn.lordicon.com/lordicon.js"
        strategy="afterInteractive"
      />
      <Link href={"/"} className='text-2xl font-bold'>
  Uphold
      </Link>
      <div className="flex items-center gap-4">
        <div className="relative" ref={searchRef}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-white hover:bg-gray-700 rounded-full"
            aria-label="Search users"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {isSearchOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-lg p-4 z-50">
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking in input
                />
              </div>
              
              {/* User Suggestions */}
              <div className="mt-3 border-t border-gray-700 pt-2">
                <h3 className="text-xs text-gray-400 mb-2">
                  {searchQuery.trim() ? 'Matching users:' : 'Start typing to search users'}
                </h3>
                
                {searchQuery.trim() && (
                  <div>
                    {isLoading ? (
                      <div className="py-2 text-center text-sm text-gray-400">
                        <div className="animate-pulse">Loading suggestions...</div>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <ul className="max-h-64 overflow-y-auto">
                        {suggestions.map((user) => (
                          <li key={user.id} className="border-b border-gray-700 last:border-0">
                            <button
                              onClick={() => handleSelectSuggestion(user.username)}
                              className="w-full flex items-center p-3 hover:bg-gray-700 rounded-md transition-colors duration-200"
                            >
                              <div className="flex-shrink-0 w-10 h-10 mr-3">
                                {user.profilepic ? (
                                  <Image
                                    src={user.profilepic}
                                    alt={user.name}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover w-10 h-10 border border-gray-600"
                                  />
                                ) : (
                                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full w-10 h-10 flex items-center justify-center text-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <p className="text-white text-sm font-medium">{user.name}</p>
                                <p className="text-blue-400 text-xs">@{user.username}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-3 text-center text-sm text-gray-400">
                        No matching users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {status === 'unauthenticated' && !session && (
          <span className="text-red-400 font-semibold mr-2">Signed out</span>
        )}
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
                    <button onClick={() => handleNavigation('/favorites')} className={getButtonClassName('/favorites')}>
                      My Favorites
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
