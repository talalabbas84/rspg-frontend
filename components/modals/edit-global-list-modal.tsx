"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { GlobalList } from "@/types";

// Helper: Pretty-print JSON or show string
function stringifyValue(val: any) {
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

// Helper: Try parsing JSON, fallback to string
function parseValue(val: string) {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

interface EditGlobalListModalProps {
  list: GlobalList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (list: GlobalList) => void;
}

interface EditableItem {
  id?: number;
  value: string; // always a string in UI, could be a JSON object/array/primitive
  error?: string;
}

export function EditGlobalListModal({
  list,
  open,
  onOpenChange,
  onUpdate,
}: EditGlobalListModalProps) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);

  useEffect(() => {
    if (list) {
      setName(list.name);
      setItems(
        list.items && list.items.length > 0
          ? list.items.map((item) => ({
              id: item.id,
              value: stringifyValue(item.value),
              error: undefined,
            }))
          : [{ value: "", error: undefined }]
      );
    }
  }, [list]);

  // On each value change, validate as JSON (if not plain string)
  const updateItem = (index: number, value: string) => {
    let error: string | undefined = undefined;
    // If not empty, try parsing
    if (value.trim() !== "") {
      try {
        JSON.parse(value);
      } catch (e) {
        error = "Invalid JSON";
      }
    }
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, value, error } : item
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!list) return;

    // Remove 'id' from all items sent to backend, parse value for object/array/primitive
    const filteredItems = items
      .filter((item) => item.value.trim() !== "")
      .map((item, idx) => ({
        value: parseValue(item.value),
        order: idx,
      }));

    // Compose the update payload
    const updatedList: GlobalList = {
      ...list,
      name,
      items: filteredItems,
      updated_at: new Date().toISOString(),
    };

    onUpdate(updatedList);
    onOpenChange(false);
  };

  const addItem = () => setItems([...items, { value: "", error: undefined }]);
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  if (!list) return null;

  // Disable update if any item has invalid JSON
  const hasErrors = items.some((item) => item.error);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Global List</DialogTitle>
         
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="list-name">Global List Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Global List Values (enter plain text or JSON)</Label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id ?? index} className="flex items-start gap-3">
                  <span className="text-sm text-gray-500 mt-2 w-6">
                    {index + 1}.
                  </span>
                  <div className="flex-1 space-y-1">
                    <Textarea
                      placeholder='Enter value (e.g., "hello" or {"fact":"..."})'
                      value={item.value}
                      onChange={(e) => updateItem(index, e.target.value)}
                      className={`min-h-[50px] font-mono ${item.error ? "border-red-400" : ""}`}
                    />
                    {item.error && (
                      <span className="text-xs text-red-500">{item.error}</span>
                    )}
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="mt-1 bg-white text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Add Field
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-gray-600 text-white hover:bg-gray-700"
              disabled={hasErrors}
            >
              Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
