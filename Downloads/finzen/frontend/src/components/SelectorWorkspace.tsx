import { useMisWorkspaces } from "@/hooks/useWorkspace";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Workspace } from "@/types/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function SelectorWorkspace() {
  const { workspace, setWorkspace } = useWorkspaceStore();
  const { data: workspaces = [] } = useMisWorkspaces();

  if (!workspace) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-white text-sm font-medium">
        <span>{workspace.emoji}</span>
        <span className="max-w-[100px] truncate">{workspace.nombre}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-gray-400 font-normal">
          Cambiar workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws: Workspace) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setWorkspace(ws)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span>{ws.emoji}</span>
            <span className="flex-1">{ws.nombre}</span>
            {ws.id === workspace.id && (
              <span className="text-xs text-accent-positive font-semibold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
