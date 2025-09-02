"use client"
import Link from "next/link";
import type { ReactElement } from "react";

export default function Home(): ReactElement {
  return (
    <div className="text-white text-center px-4 sm:px-6 lg:px-8">
      <div className="min-h-[80vh] flex flex-col justify-center items-center">
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <span
            className="font-extrabold text-4xl sm:text-5xl md:text-6xl bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent translate-y-3"
            style={{ textShadow: '0px 3px 6px rgba(0, 0, 0, 0.4)' }}
          >
            Get Me A Chai
          </span>
          <div className="w-24 h-24 rounded-full flex items-center justify-center translate-y-4">
            <span className="text-4xl">🍵</span>
          </div>
        </div>
        <p className="pt-6 font-bold text-base sm:text-lg md:text-xl max-w-md md:max-w-2xl">
          A crowdfunding platform for creators. Get funded by your fans and followers. Start now!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 text-lg mt-8 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link href="/login">
            <button type="button" className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-3">
              Start here
            </button>
          </Link>
          <button 
            type="button" 
            className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById('learn-more-section');
              if (element) {
                element.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }
            }}
          >
            Read more
          </button>
        </div>
      </div>

      <div className="w-full bg-gray-300 h-px"></div>

      <div className="text-white container mx-auto py-12 md:py-16">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-10 md:mb-12">Your fans can buy you a chai</h1>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 justify-around mt-8">
          <div className="item space-y-4 flex flex-col items-center justify-start p-6 rounded-lg hover:bg-slate-800 transition-colors duration-300 w-full md:w-1/3">
            <div className="bg-slate-700 rounded-full p-3 w-28 h-28 flex items-center justify-center">
              <span className="text-4xl">💰</span>
            </div>
            <p className="font-bold text-xl">Fund your passion</p>
            <p className="text-center text-neutral-300">Empower your creative projects by letting your fans become your biggest supporters.</p>
          </div>

          <div className="item space-y-4 flex flex-col items-center justify-start p-6 rounded-lg hover:bg-slate-800 transition-colors duration-300 w-full md:w-1/3">
            <div className="bg-slate-700 rounded-full p-3 w-28 h-28 flex items-center justify-center">
              <span className="text-4xl">💝</span>
            </div>
            <p className="font-bold text-xl">Accept donations</p>
            <p className="text-center text-neutral-300">Receive financial support directly from your audience with a simple and secure system.</p>
          </div>

          <div className="item space-y-4 flex flex-col items-center justify-start p-6 rounded-lg hover:bg-slate-800 transition-colors duration-300 w-full md:w-1/3">
            <div className="bg-slate-700 rounded-full p-3 w-28 h-28 flex items-center justify-center">
              <span className="text-4xl">👥</span>
            </div>
            <p className="font-bold text-xl">Engage your community</p>
            <p className="text-center text-neutral-300">Build a stronger connection with your followers by letting them be part of your journey.</p>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-600 h-px mt-8"></div>

      <div className="container mx-auto py-12 md:py-16" id="learn-more-section">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8">Learn more about us</h1>
        <div className="max-w-4xl mx-auto text-base md:text-lg text-neutral-300 leading-relaxed">
            <p>
              'Get Me A Chai' was born from a simple idea: great work deserves support. We believe that creators are the lifeblood of culture and innovation, but often lack the resources to bring their visions to life. Our platform provides a direct bridge between you and your audience, removing the barriers and allowing for a transparent flow of support. Whether you're a writer, artist, developer, or podcaster, 'Get Me A Chai' is your personal crowdfunding space to gather the fuel you need to keep creating, one chai at a time. Join us in fostering a community where creativity thrives and every fan has the power to make a difference.
            </p>
        </div>
      </div>
    </div>
  );
}
