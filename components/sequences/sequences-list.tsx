"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSequences } from "@/hooks/use-sequences"

export function SequencesList() {
  const { sequences, deleteSequence, loading } = useSequences()
  const router = useRouter()

  const handleEdit = (sequenceId: string) => {
    router.push(`/sequence/${sequenceId}`)
  }

  const handleRun = (sequenceId: string) => {
    // Navigate to sequence page and auto-run
    router.push(`/sequence/${sequenceId}?autorun=true`)
  }

  const handleDelete = async (sequenceId: string) => {
    if (confirm("Are you sure you want to delete this sequence?")) {
      try {
        await deleteSequence(sequenceId)
      } catch (error) {
        alert("Failed to delete sequence")
      }
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading sequences...</div>
  }

  return (
    <div className="space-y-3">
      {sequences.map((sequence) => (
        <Card key={sequence.id} className="p-4 bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-900 font-medium">{sequence.name}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(sequence.id)}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                Edit/Run
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(sequence.id)}
                className="text-gray-600 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
      {sequences.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No sequences found. Create your first sequence to get started.
        </div>
      )}
    </div>
  )
}
