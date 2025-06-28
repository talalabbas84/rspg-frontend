"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { useGlobalVariables } from "@/hooks/use-global-variables"

interface CreateVariableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateVariableModal({ open, onOpenChange }: CreateVariableModalProps) {
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { createVariable, loading } = useGlobalVariables()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createVariable({ name, value, description })
      onOpenChange(false)
      setName("")
      setValue("")
      setDescription("")
    } catch (err: any) {
      setError(err?.message || "Failed to create variable")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Global Variable</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="variable-name">Variable Name</Label>
            <Input
              id="variable-name"
              placeholder="Enter variable name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="variable-value">Variable Value</Label>
            <Textarea
              id="variable-value"
              placeholder="Enter variable value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="variable-description">Description (optional)</Label>
            <Textarea
              id="variable-description"
              placeholder="Describe this variable (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[50px]"
            />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gray-600 text-white hover:bg-gray-700" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
