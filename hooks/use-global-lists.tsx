"use client"

import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "./use-auth"

// ---- Types ----
export interface GlobalList {
  id: number
  name: string
  description?: string
  items: { value: string }[]
  // Add other fields as needed
}

interface GlobalListsContextType {
  globalLists: GlobalList[]
  loading: boolean
  error: string | null
  createGlobalList: (data: { name: string; description?: string; items: { value: string }[] }) => Promise<GlobalList>
  updateGlobalList: (id: number, data: Partial<GlobalList>) => Promise<GlobalList>
  deleteGlobalList: (id: number) => Promise<void>
  refetch: () => void
}

// ---- Context ----
const GlobalListsContext = createContext<GlobalListsContextType | undefined>(undefined)

// ---- Provider + Hook ----
export function GlobalListsProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const {user} = useAuth()
  const [globalLists, setGlobalLists] = useState<GlobalList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch
  const fetchGlobalLists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getGlobalLists()
      setGlobalLists(data)
    } catch (err: any) {
      setError(err?.message || "Failed to fetch global lists")
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to fetch global lists" })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  // Create
  const createGlobalList = useCallback(async (data: { name: string; description?: string; items: { value: string }[] }) => {
    setLoading(true)
    setError(null)
    try {
      const newList = await apiClient.createGlobalList(data)
      setGlobalLists((prev) => [newList, ...prev])
      toast({ title: "Success", description: "Global list created successfully." })
      return newList
    } catch (err: any) {
      setError(err?.message || "Failed to create global list")
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to create global list" })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Update
  const updateGlobalList = useCallback(async (id: number, data: Partial<GlobalList>) => {
    setLoading(true)
    setError(null)
    try {
      const updatedList = await apiClient.updateGlobalList(id, data)
      setGlobalLists((prev) => prev.map(list => (list.id === id ? updatedList : list)))
      toast({ title: "Success", description: "Global list updated successfully." })
      return updatedList
    } catch (err: any) {
      setError(err?.message || "Failed to update global list")
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to update global list" })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Delete
  const deleteGlobalList = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.deleteGlobalList(id)
      setGlobalLists((prev) => prev.filter(list => list.id !== id))
      toast({ title: "Success", description: "Global list deleted successfully." })
    } catch (err: any) {
      setError(err?.message || "Failed to delete global list")
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to delete global list" })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Refetch
  const refetch = useCallback(() => {
    fetchGlobalLists()
  }, [fetchGlobalLists])

  useEffect(() => {
    if (user) fetchGlobalLists()
  }, [fetchGlobalLists, user])

  const value = useMemo(
    () => ({
      globalLists,
      loading,
      error,
      createGlobalList,
      updateGlobalList,
      deleteGlobalList,
      refetch,
    }),
    [globalLists, loading, error, createGlobalList, updateGlobalList, deleteGlobalList, refetch]
  )

  return (
    <GlobalListsContext.Provider value={value}>
      {children}
    </GlobalListsContext.Provider>
  )
}

// ---- Hook ----
export function useGlobalLists() {
  const ctx = useContext(GlobalListsContext)
  if (!ctx) throw new Error("useGlobalLists must be used within a GlobalListsProvider")
  return ctx
}
