import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-black pointer-events-none">
      {/* Layer 1: Subtle dot grid */}
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:20px_20px]"></div>

      {/* Layer 2: The colored glows - Replaced with subtle white/gray for modern dark theme */}
      <div className="absolute inset-0 h-full w-full">
        {/* Subtle White/Gray Glow */}
        <div className="absolute right-1/2 top-1/2 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 transform rounded-full bg-[rgba(255,255,255,0.03)] blur-3xl"></div>
        
        {/* Another Subtle Glow */}
        <div className="absolute right-1/2 top-1/2 h-[600px] w-[600px] -translate-y-1/2 -translate-x-1/4 transform rounded-full bg-[rgba(255,255,255,0.02)] blur-3xl"></div>
      </div>
    </div>
  );
};

export default Background;
