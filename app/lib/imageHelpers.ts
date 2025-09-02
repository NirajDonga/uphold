"use client"
import { toast } from 'react-toastify';

// Intercept image errors and show toast notifications
export function setupImageErrorHandling() {
  // Add global error handler for images
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    
    // Only handle image errors
    if (target.tagName === 'IMG') {
      const imgElement = target as HTMLImageElement;
      const src = imgElement.src || 'Unknown image';
      const alt = imgElement.alt || 'Unknown description';
      
      // Extract the domain from the URL
      let domain = 'Unknown domain';
      try {
        const url = new URL(src);
        domain = url.hostname;
      } catch (e) {
        // Ignore URL parsing errors
      }
      
      // Only show toast for non-local images (e.g., Cloudinary)
      if (!domain.includes('localhost') && !src.startsWith('data:')) {
        toast.warn(`Failed to load image from ${domain}`, {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
      // Set fallback for profile images
      if (alt.includes('profile')) {
        imgElement.src = 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png';
      }
      // Set fallback for cover images
      else if (alt.includes('cover')) {
        imgElement.src = 'https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generator-ai-illustration-photo.jpg';
      }
      
      // Prevent the browser's default error handling
      event.preventDefault();
    }
  }, true);
}

// Helper function to check if an image URL is valid
export function checkImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// This function could be called at app startup
export default function setupImageHandling() {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    setupImageErrorHandling();
  }
}
