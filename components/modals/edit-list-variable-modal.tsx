"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export function EditListVariableDialog({
  open,
  onOpenChange,
  variableName,
  initialList,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variableName: string;
  initialList: string[];
  onSave: (list: string[]) => void;
}) {
  const [list, setList] = useState<string[]>(initialList || []);
  const [newItem, setNewItem] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit List: {variableName}</DialogTitle>
          <Button size="sm" variant="ghost" className="absolute right-2 top-2" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4">
          <ul className="space-y-1">
            {list.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    setList((l) => l.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => setList((l) => l.filter((_, idx) => idx !== i))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newItem.trim()) setList((l) => [...l, newItem.trim()]);
              setNewItem("");
            }}
            className="flex gap-2"
          >
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add new item"
            />
            <Button type="submit" size="sm">Add</Button>
          </form>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSave(list.filter(Boolean));
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
