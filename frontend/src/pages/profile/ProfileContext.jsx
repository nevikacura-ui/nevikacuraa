import { createContext, useContext } from 'react';

const ProfileContext = createContext(null);

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileContext.Provider');
  return ctx;
};

export default ProfileContext;
