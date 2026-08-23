import { createContext, useContext } from 'react';

const OrangeStaffContext = createContext(null);

export const useOrangeStaff = () => {
  const ctx = useContext(OrangeStaffContext);
  if (!ctx) throw new Error('useOrangeStaff must be used within OrangeStaffContext.Provider');
  return ctx;
};

export default OrangeStaffContext;
