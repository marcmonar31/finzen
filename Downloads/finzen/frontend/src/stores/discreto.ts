import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DiscreteStore {
  discreto: boolean;
  toggleDiscreto: () => void;
}

export const useDiscreto = create<DiscreteStore>()(
  persist(
    (set) => ({
      discreto: false,
      toggleDiscreto: () => set((s) => ({ discreto: !s.discreto })),
    }),
    { name: "finzen-discreto" }
  )
);
