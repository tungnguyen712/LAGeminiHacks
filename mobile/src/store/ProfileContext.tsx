import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AccessibilityProfile } from '../types/Profile';

interface ProfileContextType {
  selectedProfile: AccessibilityProfile | null;
  setSelectedProfile: (profile: AccessibilityProfile | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProfile, setSelectedProfile] = useState<AccessibilityProfile | null>(null);

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
