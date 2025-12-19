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
    const baseClasses = "block w-full text-left px-4 py-2.5 hover:bg-gray-800/50 transition-colors cursor-pointer rounded-lg mx-1 w-[calc(100%-8px)]";
    const activeClasses = "text-white font-semibold bg-gray-800";
    const inactiveClasses = "text-gray-400 hover:text-gray-200";
    return `${baseClasses} ${pathname === path ? activeClasses : inactiveClasses}`;
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
  
  const handleSelectSuggestion = (username: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    router.push(`/${username}`);
  };

  if (status === 'loading') {
    return (
      <nav className='bg-black/50 backdrop-blur-md border-b border-gray-800 text-white h-20 flex items-center justify-between px-4 sm:px-8 md:px-16 sticky top-0 z-50'>
        <div className='text-2xl font-bold tracking-tight'>Uphold</div>
        <div className="animate-pulse bg-gray-800 h-10 w-24 rounded-full"></div>
      </nav>
    );
  }

  // Always use username for display, never fallback to name
  const username = session?.user?.username || '';
  const profileUrl = session?.user?.profilePic || '';

  return (
    <nav className='bg-black/50 backdrop-blur-md border-b border-gray-800 text-white h-20 flex items-center justify-between px-4 sm:px-8 md:px-16 sticky top-0 z-50 transition-all duration-300'>
      <Script
        src="https://cdn.lordicon.com/lordicon.js"
        strategy="afterInteractive"
      />
      <Link href={"/"} className='group flex items-center gap-2'>
        <span className='text-2xl font-bold tracking-tight group-hover:text-gray-200 transition-colors'>Uphold</span>
      </Link>
      <div className="flex items-center gap-4">
        <div className="relative" ref={searchRef}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2.5 rounded-full transition-all duration-200 ${isSearchOpen ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            aria-label="Search users"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {isSearchOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-black/90 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 border border-gray-800 placeholder-gray-500 transition-all"
                  autoFocus
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
              
              {/* User Suggestions */}
              <div className="mt-3 pt-2">
                {searchQuery.trim() && (
                  <div>
                    {isLoading ? (
                      <div className="py-4 text-center text-sm text-gray-500">
                        <div className="animate-pulse flex justify-center items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                          <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <ul className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {suggestions.map((user) => (
                          <li key={user.id} className="mb-1 last:mb-0">
                            <button
                              onClick={() => handleSelectSuggestion(user.username)}
                              className="w-full flex items-center p-2 hover:bg-gray-800/50 rounded-lg transition-colors duration-200 group"
                            >
                              <div className="flex-shrink-0 w-9 h-9 mr-3">
                                {user.profilepic ? (
                                  <Image
                                    src={user.profilepic}
                                    alt={user.name}
                                    width={36}
                                    height={36}
                                    className="rounded-full object-cover w-9 h-9 border border-gray-800 group-hover:border-gray-600 transition-colors"
                                  />
                                ) : (
                                  <div className="bg-gray-800 rounded-full w-9 h-9 flex items-center justify-center text-xs font-medium text-gray-300 border border-gray-700">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="text-left overflow-hidden">
                                <p className="text-gray-200 text-sm font-medium truncate group-hover:text-white transition-colors">{user.name}</p>
                                <p className="text-gray-500 text-xs truncate">@{user.username}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-4 text-center text-sm text-gray-500">
                        No creators found
                      </div>
                    )}
                  </div>
                )}
                {!searchQuery.trim() && (
                   <div className="py-2 text-center text-xs text-gray-600">
                     Type to search for creators
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        {session ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              type="button"
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 ${isDropdownOpen ? 'bg-gray-800 border-gray-600' : 'bg-transparent border-transparent hover:bg-gray-900 hover:border-gray-800'}`}
            >
              {profileUrl ? (
                <Image
                  src={profileUrl}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-gray-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium border border-gray-700">
                  {username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-medium text-gray-300 hidden sm:block">{username || 'User'}</span>
              <svg className={`w-2.5 h-2.5 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="z-50 absolute right-0 mt-3 w-56 bg-black/90 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-gray-800 mb-1">
                  <p className="text-sm text-white font-medium truncate">{username}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                </div>
                <ul className="text-sm text-gray-300">
                  <li>
                    <button onClick={() => handleNavigation(`/${username}`)} className={getButtonClassName(`/${username}`)}>
                      Your Page
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
                      Favorites
                    </button>
                  </li>
                  <li className="mt-1 border-t border-gray-800 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
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
              className="text-black bg-white hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-500 font-bold rounded-full text-sm px-6 py-2.5 text-center cursor-pointer transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
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
