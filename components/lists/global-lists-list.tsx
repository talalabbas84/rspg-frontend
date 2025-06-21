"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Edit, Trash2 } from "lucide-react"
import type { GlobalList } from "@/types"
import { EditGlobalListModal } from "@/components/modals/edit-global-list-modal"

export function GlobalListsList() {
  const [lists, setLists] = useState<GlobalList[]>([])
  const [editingList, setEditingList] = useState<GlobalList | null>(null)

  useEffect(() => {
    // Mock data - replace with actual API call
    setLists([
      {
        id: "1",
        name: "NewGlobalList",
        values: ["Item 1", "Item 2", "Item 3"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "2",
        name: "items222",
        values: ["Item A", "Item B"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "3",
        name: "paragraph_check",
        values: ["Paragraph 1", "Paragraph 2"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "4",
        name: "paragraph_check",
        values: ["Check 1", "Check 2"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "5",
        name: "paragraph_check",
        values: ["Final check"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ])
  }, [])

  const handleEdit = (list: GlobalList) => {
    setEditingList(list)
  }

  const handlePreview = (listId: string) => {
    // Implement preview functionality
    console.log("Previewing list:", listId)
  }

  const handleDelete = (listId: string) => {
    setLists(lists.filter((list) => list.id !== listId))
  }

  const handleUpdateList = (updatedList: GlobalList) => {
    setLists(lists.map((list) => (list.id === updatedList.id ? updatedList : list)))
    setEditingList(null)
  }

  return (
    <>
      <div className="space-y-3">
        {lists.map((list) => (
          <Card key={list.id} className="p-4 bg-white border border-gray-200">
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900">Variable Name</div>
              <div className="text-sm text-gray-600">{list.name}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(list)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit/Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(list.id)}
                  className="text-gray-600 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <EditGlobalListModal
        list={editingList}
        open={!!editingList}
        onOpenChange={(open) => !open && setEditingList(null)}
        onUpdate={handleUpdateList}
      />
    </>
  )
}
