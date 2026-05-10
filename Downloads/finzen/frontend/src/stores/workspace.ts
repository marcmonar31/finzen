import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/types/api";

interface WorkspaceStore {
  workspace: Workspace | null;
  setWorkspace: (w: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspace: null,
      setWorkspace: (w) => set({ workspace: w }),
    }),
    { name: "finzen-workspace" }
  )
);
