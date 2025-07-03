"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";
import type { GlobalList } from "@/types";
import { EditGlobalListModal } from "@/components/modals/edit-global-list-modal";
import { toast } from "sonner";
import { useGlobalLists } from "@/hooks/use-global-lists";

export function GlobalListsList() {
  const [lists, setLists] = useState<GlobalList[]>([]);
  const [editingList, setEditingList] = useState<GlobalList | null>(null);
  const { globalLists, updateGlobalList, deleteGlobalList } = useGlobalLists(); // Assuming this hook is used for fetching global lists

  const handleEdit = (list: GlobalList) => {
    setEditingList(list);
  };

  function renderValue(value: any): React.ReactNode {
    if (value == null) return <span className="text-gray-400">null</span>;
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value.toString();
    }
    if (Array.isArray(value)) {
      // Display up to 2 elements, add ellipsis if long
      return (
        <span>
          [
          {value.slice(0, 2).map((v, idx) => (
            <span key={idx}>
              {renderValue(v)}
              {idx < value.length - 1 && ", "}
            </span>
          ))}
          {value.length > 2 ? ", ..." : ""}]
        </span>
      );
    }
    if (typeof value === "object") {
      // Display as key: value, but short, like "fact: ..., category: ..."
      return (
        <span>
          {Object.entries(value)
            .slice(0, 3)
            .map(([k, v], idx, arr) => (
              <span key={k}>
                <span className="font-semibold">{k}</span>: {renderValue(v)}
                {idx < arr.length - 1 ? ", " : ""}
              </span>
            ))}
          {Object.keys(value).length > 3 ? ", ..." : ""}
        </span>
      );
    }
    // fallback
    return JSON.stringify(value);
  }

  const handleDelete = (listId: string) => {
    deleteGlobalList(listId)
      .then(() => {
        setLists((prev) => prev.filter((list) => list.id !== listId));
      })
      .catch((error) => {
        console.error("Failed to delete list:", error);
      });
  };

  const handleUpdateList = async (updatedList: GlobalList) => {
    try {
      const newList = await updateGlobalList(updatedList.id, updatedList);
      setLists((prev) =>
        prev.map((list) => (list.id === newList.id ? newList : list))
      );
    } catch (error) {
      console.error("Failed to update list:", error);
    }

    setEditingList(null);
  };

  return (
    <>
      <div className="space-y-3">
        {globalLists.length === 0 && (
          <Card className="p-4 text-gray-500 bg-gray-50 border-dashed border-2 border-gray-200 text-center">
            No global lists found.
          </Card>
        )}
        {globalLists.map((list) => (
          <Card key={list.id} className="p-4 bg-white border border-gray-200">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">List Name</div>
              <div className="text-base text-gray-800">{list.name}</div>

              <div className="text-sm font-medium text-gray-900 mt-2">
                Values
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {list.items && list.items.length > 0 ? (
                  list.items.map((item: any, idx: number) => (
                    <span
                      key={item.id || idx}
                      className="inline-block bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium  truncate"
                      title={
                        typeof item.value === "string"
                          ? item.value
                          : JSON.stringify(item.value)
                      }
                    >
                      {renderValue(item.value)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No values</span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4">
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
  );
}
