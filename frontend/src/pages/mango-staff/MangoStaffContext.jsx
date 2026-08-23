import { createContext, useContext } from 'react';

const MangoStaffContext = createContext(null);

export const useMangoStaff = () => {
  const ctx = useContext(MangoStaffContext);
  if (!ctx) throw new Error('useMangoStaff must be used within MangoStaffContext.Provider');
  return ctx;
};

export default MangoStaffContext;
