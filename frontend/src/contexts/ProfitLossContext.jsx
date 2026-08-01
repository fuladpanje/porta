import { createContext, useContext, useState } from 'react';

const ProfitLossContext = createContext();

export function ProfitLossProvider({ children }) {
  const [plMode, setPlMode] = useState('all');

  return (
    <ProfitLossContext.Provider value={{ plMode, setPlMode }}>
      {children}
    </ProfitLossContext.Provider>
  );
}

export function useProfitLoss() {
  return useContext(ProfitLossContext);
}
