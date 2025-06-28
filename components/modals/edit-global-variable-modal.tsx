// components/modals/edit-global-variable-modal.tsx
"use client";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function EditGlobalVariableModal({ variableName, currentValue, open, onClose, onSave }) {
  const [val, setVal] = useState(currentValue ?? "");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Edit Global Variable: <span className="font-mono">{variableName}</span></DialogTitle>
        <Input value={val} onChange={e => setVal(e.target.value)} autoFocus />
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-blue-600 text-white"
            onClick={() => onSave(val)}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
