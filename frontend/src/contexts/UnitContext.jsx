import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const UnitContext = createContext();

export function UnitProvider({ children }) {
  const [unit, setUnitState] = useState('rial');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadUnit = async () => {
      try {
        const res = await api.get('/user');
        if (res.data.user?.unit) {
          setUnitState(res.data.user.unit);
        }
      } catch {
        // not logged in or error
      } finally {
        setLoaded(true);
      }
    };
    loadUnit();
  }, []);

  const setUnit = async (u) => {
    setUnitState(u);
    try {
      await api.put('/user/unit', { unit: u });
    } catch {}
  };

  const toggleUnit = () => setUnit(unit === 'rial' ? 'toman' : 'rial');

  if (!loaded) return null;

  return (
    <UnitContext.Provider value={{ unit, setUnit, toggleUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
