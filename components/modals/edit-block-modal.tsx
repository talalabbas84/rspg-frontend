"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Trash2 } from "lucide-react"

interface EditListVariableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialList: string[]
  onSave: (newList: string[]) => void
  variableName?: string
}

export function EditListVariableDialog({
  open,
  onOpenChange,
  initialList,
  onSave,
  variableName = "List Variable"
}: EditListVariableDialogProps) {
  const [list, setList] = useState<string[]>(initialList)

  useEffect(() => {
    if (open) setList(initialList)
  }, [open, initialList])

  const handleItemChange = (idx: number, value: string) => {
    setList((prev) => prev.map((item, i) => (i === idx ? value : item)))
  }
  const handleAdd = () => setList((prev) => [...prev, ""])
  const handleRemove = (idx: number) => setList((prev) => prev.filter((_, i) => i !== idx))
  const handleSave = () => {
    // Remove empty items before save
    onSave(list.filter((val) => val.trim()))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit {variableName}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {list.length === 0 && <div className="text-gray-400 text-xs">No items yet.</div>}
          {list.map((val, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={val}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                placeholder={`Item ${idx + 1}`}
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)}>
                <Trash2 className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 text-white">
            Save List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
