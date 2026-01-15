/**
 * Smart Biometric Component
 * Automatically switches between Face Recognition (mobile) and WebAuthn (desktop)
 */
import React, { useState, useEffect } from 'react';
import FaceBiometric from '@/components/FaceBiometric';
import BiometricAttendance from '@/components/BiometricAttendance';

// Mobile detection hook
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobileByWidth = window.innerWidth <= 1024;
      const mobileByAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobileByWidth || mobileByAgent);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Smart Biometric component that switches based on device type
const SmartBiometric = ({ clinic }) => {
  const isMobile = useIsMobile();
  
  // Use Face Recognition on mobile/tablet, WebAuthn fingerprint on desktop
  if (isMobile) {
    return <FaceBiometric clinic={clinic} />;
  }
  return <BiometricAttendance clinic={clinic} />;
};

export default SmartBiometric;
