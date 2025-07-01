"use client";

import type React from "react";

import { useState } from "react";
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
import { useGlobalLists } from "@/hooks/use-global-lists";
import { toast } from "sonner";

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateListModal({ open, onOpenChange }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<string[]>([""]);
  const { createGlobalList } = useGlobalLists();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const filteredValues = values.filter((value) => value.trim() !== "");

      if (filteredValues.length === 0) {
        toast.error("List must contain at least one value");
        setLoading(false);
        return;
      }
      await createGlobalList({
        name,
        items: filteredValues.map((val) => {
          let parsed = val;
          try {
            parsed = JSON.parse(val);
          } catch (_) {
            // If not valid JSON, keep as string
          }
          return { value: parsed };
        }),
      });


      onOpenChange(false);
      setName("");
      setValues([""]);

      // Show success message
      alert("List created successfully!");
    } catch (error) {
      alert("Failed to create list");
    } finally {
      setLoading(false);
    }
  };

  const addValue = () => {
    setValues([...values, ""]);
  };

  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const removeValue = (index: number) => {
    if (values.length > 1) {
      setValues(values.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Global List</DialogTitle>
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
            <Label htmlFor="list-name">List Name</Label>
            <Input
              id="list-name"
              placeholder='Enter JSON object (e.g. {"fact": "...", "category": "..."}) or string'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>List Values</Label>
            <div className="space-y-2">
              {values.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">
                    {index + 1}.
                  </span>
                  <Input
                    placeholder="Enter list item"
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
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
