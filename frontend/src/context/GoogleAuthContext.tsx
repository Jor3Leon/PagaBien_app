import React, { createContext, useContext, useState } from 'react';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  token?: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  spreadsheetId: string;
  serviceAccountEmail: string;
  setSpreadsheetId: (id: string) => void;
  login: (userData: GoogleUser) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
}

const DEFAULT_SERVICE_ACCOUNT = 'pagabien-sheets-bot@pagabien.iam.gserviceaccount.com';

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('pagabien_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Datos de sesión corruptos en localStorage, se reinicia sesión:', e);
      localStorage.removeItem('pagabien_google_user');
      return null;
    }
  });

  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(() => {
    return localStorage.getItem('pagabien_spreadsheet_id') || '';
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
    localStorage.setItem('pagabien_spreadsheet_id', id);
  };

  const login = (userData: GoogleUser) => {
    setUser(userData);
    localStorage.setItem('pagabien_google_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pagabien_google_user');
    // Clear spreadsheet binding so next user doesn't inherit it
    setSpreadsheetIdState('');
    localStorage.removeItem('pagabien_spreadsheet_id');
    
    // Disable Google GIS AutoSelect on logout if loaded
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (e) {
        console.warn('No se pudo desactivar el autoselect de Google:', e);
      }
    }
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        spreadsheetId,
        serviceAccountEmail: DEFAULT_SERVICE_ACCOUNT,
        setSpreadsheetId,
        login,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isSyncModalOpen,
        setIsSyncModalOpen,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth debe usarse dentro de un GoogleAuthProvider');
  }
  return context;
};
