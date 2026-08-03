import { createContext, useContext, useState, useEffect } from 'react';

const SizeContext = createContext();

const SIZE_KEY = 'content-size';

export function SizeProvider({ children }) {
  const [size, setSizeState] = useState(() => {
    return localStorage.getItem(SIZE_KEY) || 'default';
  });

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, size);
    if (size === 'large') {
      document.documentElement.classList.add('size-large');
    } else {
      document.documentElement.classList.remove('size-large');
    }
  }, [size]);

  const setSize = (s) => setSizeState(s);

  const toggleSize = () => setSize(size === 'default' ? 'large' : 'default');

  return (
    <SizeContext.Provider value={{ size, setSize, toggleSize }}>
      {children}
    </SizeContext.Provider>
  );
}

export function useSize() {
  return useContext(SizeContext);
}
