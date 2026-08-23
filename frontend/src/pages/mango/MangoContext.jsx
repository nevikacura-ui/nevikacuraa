import { createContext, useContext } from 'react';

const MangoContext = createContext(null);

export const useMango = () => {
  const ctx = useContext(MangoContext);
  if (!ctx) throw new Error('useMango must be used within MangoProvider');
  return ctx;
};

export default MangoContext;
