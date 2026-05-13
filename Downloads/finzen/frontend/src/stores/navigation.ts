import { create } from "zustand";

interface NavigationStore {
  navigate: (section: string) => void;
  register: (fn: (section: string) => void) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  navigate: () => {},
  register: (fn) => set({ navigate: fn }),
}));
