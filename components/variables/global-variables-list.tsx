"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Edit, Trash2 } from "lucide-react"
import type { Variable } from "@/types"
import { EditVariableModal } from "@/components/modals/edit-variable-modal"
import { useGlobalVariables } from "@/hooks/use-global-variables"

export function GlobalVariablesList() {
  const { variables, loading, error,  deleteVariable, updateVariable } = useGlobalVariables()
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleEdit = (variable: Variable) => {
    setEditingVariable(variable)
  }

  const handleDelete = async (variableId: string) => {
    if (confirm("Are you sure you want to delete this variable?")) {
      setDeletingId(variableId)
      try {
        await deleteVariable(+variableId)
      } catch (err) {
        alert("Failed to delete variable")
      } finally {
        setDeletingId(null)
      }
    }
  }

  const handleUpdateVariable = async (updatedVariable: Variable) => {
    try {
      await updateVariable(+updatedVariable.id, updatedVariable)
      setEditingVariable(null)
    } catch (err) {
      alert("Failed to update variable")
    }
  }
  console.log("GlobalVariablesList rendered with variables:", variables)


  return (
    <>
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="text-center py-8 text-red-500">Failed to load variables</div>
        )}
        {variables.map((variable) => (
          <Card key={variable.id} className="p-4 bg-white border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Variable Name</div>
                  <div className="text-sm text-gray-900">{variable.name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Variable Value</div>
                  <div className="text-sm text-gray-600 truncate" title={variable.value_json?.value}>
                    {variable.value_json?.value}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(variable)}
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(variable.id)}
                  className="text-gray-600 hover:text-red-600 flex items-center gap-1"
                  disabled={deletingId === variable.id}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === variable.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!loading && !error && variables.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No global variables found. Create your first variable to get started.
          </div>
        )}
      </div>

      <EditVariableModal
        variable={editingVariable}
        open={!!editingVariable}
        onOpenChange={(open) => !open && setEditingVariable(null)}
        onUpdate={handleUpdateVariable}
      />
    </>
  )
}
