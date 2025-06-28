"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Trash2 } from "lucide-react";

interface EditListVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variableName: string;
  initialList?: string[];
  onSave: (list: string[]) => void;
}

export function EditListVariableDialog({
  open,
  onOpenChange,
  variableName,
  initialList = [],
  onSave,
}: EditListVariableDialogProps) {
  const [values, setValues] = useState<string[]>(initialList.length ? initialList : [""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setValues(initialList.length ? initialList : [""]);
  }, [open, initialList]);

  const addValue = () => setValues([...values, ""]);
  const updateValue = (idx: number, val: string) => {
    setValues((v) => v.map((item, i) => (i === idx ? val : item)));
  };
  const removeValue = (idx: number) => {
    setValues((v) => v.length > 1 ? v.filter((_, i) => i !== idx) : v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Remove blank entries
    const filtered = values.map(v => v.trim()).filter(Boolean);
    onSave(filtered);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit List: {variableName}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>List Values</Label>
            <div className="space-y-2">
              {values.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <Input
                    placeholder="Enter value"
                    value={value}
                    onChange={(e) => updateValue(index, e.target.value)}
                    className="flex-1"
                  />
                  {values.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeValue(index)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addValue}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Add Field
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gray-600 text-white hover:bg-gray-700"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
