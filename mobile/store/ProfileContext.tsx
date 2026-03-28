import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProfileType } from '../types/Profile';

const STORAGE_KEY = '@pathsense:profile';

interface ProfileContextValue {
  profile: ProfileType | null;
  setProfile: (p: ProfileType) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  setProfile: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileType | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setProfileState(val as ProfileType);
    });
  }, []);

  async function setProfile(p: ProfileType) {
    setProfileState(p);
    await AsyncStorage.setItem(STORAGE_KEY, p);
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  return useContext(ProfileContext);
}
