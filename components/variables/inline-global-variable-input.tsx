// components/ui/inline-global-variable-input.tsx

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Textarea } from "../ui/textarea";

export function InlineGlobalVariableInput({
  label,
  defaultValue, // the global value (readonly, string or undefined)
  override,     // string (user's override for this run)
  setOverride,  // function to update override for this run
}) {
  // Use the override if set, else fallback to defaultValue in the input
  const inputVal = typeof override === "string" && override.length > 0
    ? override
    : defaultValue ?? "";

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{label}</span>
        <span className="text-xs text-blue-600 bg-blue-50 rounded px-1.5 border border-blue-200 ml-2">
          global
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Textarea
         
          value={inputVal}
          placeholder={defaultValue ? `Default: "${defaultValue}"` : "No default set"}
          onChange={e => setOverride(e.target.value)}
        />
        {(typeof override === "string" && override.length > 0) && (
          <Button
            size="icon"
            variant="ghost"
            title="Clear override"
            onClick={() => setOverride("")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-0.5 pl-1">
        {typeof override === "string" && override.length > 0
          ? "Using override for this run."
          : "Uses global value by default."}
      </div>
    </div>
  );
}
