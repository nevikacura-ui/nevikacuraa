import { createContext, useContext } from 'react';

const StaffContext = createContext(null);

export const useStaff = () => {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within StaffContext.Provider');
  return ctx;
};

export default StaffContext;
