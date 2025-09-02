"use client";
import { useEffect } from 'react';
import setupImageHandling from '@/app/lib/imageHelpers';

export default function ImageErrorHandler() {
  useEffect(() => {
    setupImageHandling();
  }, []);
  
  return null;
}
