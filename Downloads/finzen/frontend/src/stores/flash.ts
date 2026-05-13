import { create } from "zustand";

export type FlashVariant = "success" | "delete" | "error";

interface FlashStore {
  visible: boolean;
  message: string;
  variant: FlashVariant;
  show: (message: string, variant?: FlashVariant) => void;
}

let _timer: ReturnType<typeof setTimeout> | null = null;

export const useFlashStore = create<FlashStore>((set) => ({
  visible: false,
  message: "",
  variant: "success",
  show: (message, variant = "success") => {
    if (_timer) clearTimeout(_timer);
    set({ visible: true, message, variant });
    _timer = setTimeout(() => set({ visible: false }), 1700);
  },
}));

// Callable outside React components (e.g. in mutation callbacks)
export function showFlash(message: string, variant: FlashVariant = "success") {
  useFlashStore.getState().show(message, variant);
}
