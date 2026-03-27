"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: any;
  state: string;
  result?: any;
}

export function getToolLabel(toolName: string, args: any): string {
  const file = args?.path ?? args?.new_path ?? "";
  const name = file.split("/").filter(Boolean).pop() ?? file;

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create": return `Creating ${name}`;
      case "str_replace": return `Editing ${name}`;
      case "insert": return `Editing ${name}`;
      case "view": return `Reading ${name}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": {
        const dest = (args?.new_path ?? "").split("/").filter(Boolean).pop() ?? args?.new_path ?? "";
        return `Renaming ${dest}`;
      }
      case "delete": return `Deleting ${name}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state, result }: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isDone = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
