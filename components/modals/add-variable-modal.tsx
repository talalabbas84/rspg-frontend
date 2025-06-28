"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { useAvailableVariables } from "@/hooks/use-available-variables";

interface AddVariableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVariable: (variable: string) => void;
}

export function AddVariableModal({ open, onOpenChange, onSelectVariable }: AddVariableModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { variables, loading } = useAvailableVariables();

  const filteredVariables = variables.filter((variable) =>
    variable.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectVariable = (variableValue: string) => {
    onSelectVariable(variableValue);
    onOpenChange(false);
    setSearchTerm("");
  };

  const getVariableTypeColor = (type: string) => {
    switch (type) {
      case "global":
        return "bg-blue-100 text-blue-800";
      case "list":
        return "bg-green-100 text-green-800";
      case "output":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Variable to Prompt</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Variables List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredVariables.map((variable) => (
                <div
                  key={variable.value}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectVariable(variable.value)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{variable.label}</span>
                      <span className={`text-xs px-2 py-1 rounded ${getVariableTypeColor(variable.type)}`}>
                        {variable.type}
                      </span>
                    </div>
                    {variable.description && (
                      <div className="text-sm text-gray-500 truncate mt-1" title={variable.description}>
                        {variable.description}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredVariables.length === 0 && (
            <div className="text-center py-8 text-gray-500">No variables found matching "{searchTerm}"</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
