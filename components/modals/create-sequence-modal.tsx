"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { useSequences } from "@/hooks/use-sequences"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface CreateSequenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSequenceModal({ open, onOpenChange }: CreateSequenceModalProps) {
  const { createSequence } = useSequences()
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newSequence = await createSequence({ name, description })
      onOpenChange(false)
      setName("")
      setDescription("")
      toast.success("Sequence created successfully", {
        description: `You can now edit your sequence: ${newSequence.name}`,
      })
      // Navigate to the new sequence
      router.push(`/sequence/${newSequence.id}`)
    } catch (error) {
      toast.error("Failed to create sequence", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
      console.error("Error creating sequence:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Sequence</DialogTitle>
      
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sequence-name">Sequence Name</Label>
            <Input
              id="sequence-name"
              placeholder="Enter sequence name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sequence-description">Description (Optional)</Label>
            <Textarea
              id="sequence-description"
              placeholder="Enter sequence description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
