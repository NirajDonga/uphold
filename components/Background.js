import React from 'react';

const Background = () => {
  return (

    <div className="absolute inset-0 -z-10 h-full w-full bg-black pointer-events-none">
      
      {/* Layer 1: Subtle dot grid */}
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:20px_20px]"></div>

      {/* Layer 2: The colored glows */}
      <div className="absolute inset-0 h-full w-full">
        {/* Purple/Fuchsia Glow */}
        {/* Corrected: Using a specific rgba value for the background is more robust than stacking opacity classes. */}
        <div className="absolute right-1/2 top-1/2 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 transform rounded-full bg-[rgba(192,38,211,0.15)] blur-3xl"></div>
        
        {/* Cyan/Blue Glow */}
        {/* Corrected: Same robust rgba method applied here. */}
        <div className="absolute right-1/2 top-1/2 h-[600px] w-[600px] -translate-y-1/2 -translate-x-1/4 transform rounded-full bg-[rgba(6,182,212,0.15)] blur-3xl"></div>
      </div>

    </div>
  );
};

export default Background;
