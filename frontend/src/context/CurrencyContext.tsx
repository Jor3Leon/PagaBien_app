import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Currency } from '../types';
import { SUPPORTED_CURRENCIES } from '../types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number) => string;
}

const STORAGE_KEY = 'pagabien_user_currency';

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // 1. Check if user has a saved currency preference in localStorage
    try {
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        const found = SUPPORTED_CURRENCIES.find(c => c.code === savedCode);
        if (found) return found;
      }
    } catch {
      // Ignore localStorage errors
    }

    // 2. Fallback to location/locale auto-detection
    try {
      const userLocale = navigator.language || 'en-US';
      const detected = SUPPORTED_CURRENCIES.find(c => c.locale.toLowerCase() === userLocale.toLowerCase()) ||
                       (userLocale.includes('es-CO') ? SUPPORTED_CURRENCIES[1] :
                        userLocale.includes('es-MX') ? SUPPORTED_CURRENCIES[3] :
                        userLocale.includes('es-PE') ? SUPPORTED_CURRENCIES[4] :
                        userLocale.includes('es-CL') ? SUPPORTED_CURRENCIES[5] :
                        userLocale.includes('es-AR') ? SUPPORTED_CURRENCIES[6] : SUPPORTED_CURRENCIES[0]);
      return detected;
    } catch {
      return SUPPORTED_CURRENCIES[0];
    }
  });

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem(STORAGE_KEY, newCurrency.code);
    } catch {
      // Ignore localStorage errors
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency debe usarse dentro de un CurrencyProvider');
  }
  return context;
};
