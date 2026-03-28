import { useProfileContext } from '../store/ProfileContext';

export function useProfile() {
  return useProfileContext();
}
