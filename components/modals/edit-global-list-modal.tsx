"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import type { GlobalList } from "@/types"

interface EditGlobalListModalProps {
  list: GlobalList | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (list: GlobalList) => void
}

export function EditGlobalListModal({ list, open, onOpenChange, onUpdate }: EditGlobalListModalProps) {
  const [name, setName] = useState("")
  const [values, setValues] = useState<string[]>([])

  useEffect(() => {
    if (list) {
      setName(list.name)
      setValues(list.values.length > 0 ? list.values : [""])
    }
  }, [list])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!list) return

    const filteredValues = values.filter((value) => value.trim() !== "")
    const updatedList: GlobalList = {
      ...list,
      name,
      values: filteredValues,
      updated_at: new Date().toISOString(),
    }

    onUpdate(updatedList)
  }

  const addValue = () => {
    setValues([...values, ""])
  }

  const updateValue = (index: number, value: string) => {
    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)
  }

  const removeValue = (index: number) => {
    if (values.length > 1) {
      setValues(values.filter((_, i) => i !== index))
    }
  }

  if (!list) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Global List</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="list-name">Global List Name</Label>
            <Input id="list-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-3">
            <Label>Global List Values</Label>
            <div className="space-y-3">
              {values.map((value, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-sm text-gray-500 mt-2 w-6">{index + 1}.</span>
                  <Textarea
                    placeholder="Enter list item"
                    value={value}
                    onChange={(e) => updateValue(index, e.target.value)}
                    className="flex-1 min-h-[80px]"
                  />
                  {values.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeValue(index)}
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
              onClick={addValue}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Add Field
            </Button>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-gray-600 text-white hover:bg-gray-700">
              Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
