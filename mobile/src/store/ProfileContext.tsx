import { createContext, useContext, useState, ReactNode } from 'react';
import { AccessibilityProfile } from '../types/Profile';

const STORAGE_KEY = 'pathsense_profile';

interface ProfileContextType {
  selectedProfile: AccessibilityProfile | null;
  setSelectedProfile: (profile: AccessibilityProfile | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProfile, setSelectedProfileState] = useState<AccessibilityProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setSelectedProfile = (profile: AccessibilityProfile | null) => {
    setSelectedProfileState(profile);
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <ProfileContext.Provider value={{ selectedProfile, setSelectedProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
