import React, { createContext, useContext, useState } from 'react';

const StaleDataContext = createContext();

export function StaleDataProvider({ children }) {
  const [stale, setStale] = useState(false);

  return (
    <StaleDataContext.Provider value={{ stale, setStale }}>
      {children}
    </StaleDataContext.Provider>
  );
}

export function useStaleData() {
  return useContext(StaleDataContext);
}