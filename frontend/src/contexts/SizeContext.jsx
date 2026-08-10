import { createContext, useContext, useState, useEffect } from 'react';

const SizeContext = createContext();

const SIZE_KEY = 'content-size';

const SIZE_ORDER = ['fullwidth', 'large', 'default'];

export function SizeProvider({ children }) {
  const [size, setSizeState] = useState(() => {
    return localStorage.getItem(SIZE_KEY) || 'fullwidth';
  });

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, size);
    document.documentElement.classList.remove('size-large', 'full-width');
    if (size === 'large') {
      document.documentElement.classList.add('size-large');
    } else if (size === 'fullwidth') {
      document.documentElement.classList.add('full-width');
    }
  }, [size]);

  const setSize = (s) => setSizeState(s);

  const toggleSize = () => {
    const idx = SIZE_ORDER.indexOf(size);
    setSizeState(SIZE_ORDER[(idx + 1) % SIZE_ORDER.length]);
  };

  return (
    <SizeContext.Provider value={{ size, setSize, toggleSize }}>
      {children}
    </SizeContext.Provider>
  );
}

export function useSize() {
  return useContext(SizeContext);
}
