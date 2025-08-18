"use client"
import React from 'react';
import Script from 'next/script';
import Link from 'next/link';

const Navbar = () => {
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
        <div
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors duration-200 cursor-pointer flex items-center justify-center"
        >
          <lord-icon
            src="https://cdn.lordicon.com/wjyqkiew.json"
            trigger="hover"
            stroke="bold"
            colors="primary:#FFFFFF,secondary:#FFFFFF"
            style={{ width: '25px', height: '25px' }}
          >
          </lord-icon>
        </div>

        <div>
          <Link href={"/login"}>
            <button
              type="button"
              className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-all duration-300 cursor-pointer"
            >
              Login
            </button>
          </Link>
        </div>
      </div>
    </nav>
  )
};

export default Navbar;
