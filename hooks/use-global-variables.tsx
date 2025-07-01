"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { apiClient } from "@/lib/api"
import type { Variable } from "@/types"
import { useAuth } from "./use-auth"

interface GlobalVariablesContextType {
  variables: Variable[]
  loading: boolean
  error: string | null
  refresh: () => void
  createVariable: (data: { name: string; value: string; description?: string }) => Promise<Variable>
  updateVariable: (id: number, data: { name: string; value: string; description?: string }) => Promise<Variable>
  deleteVariable: (id: number) => Promise<void>
}

const GlobalVariablesContext = createContext<GlobalVariablesContextType | undefined>(undefined)

export function GlobalVariablesProvider({ children }: { children: React.ReactNode }) {
  const [variables, setVariables] = useState<Variable[]>([])
  const {user} = useAuth() // Ensure user is authenticated before fetching variables
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all global variables
  const fetchVariables = useCallback(async () => {
    setLoading(true)
    setError(null)
    if(!user) {
      setLoading(false)
      setError("User not authenticated")
      return
    }
    try {
      const vars = await apiClient.getGlobalVariables()
      setVariables(vars)
    } catch (err: any) {
      setError(err?.message || "Failed to load global variables")
      setVariables([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchVariables()
  }, [fetchVariables])

  // Create new global variable
  const createVariable = useCallback(
    async (data: { name: string; value: string; description?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const payload = {
          name: data.name,
          type: "global",
          value_json: { value: data.value },
          description: data.description,
        }
        const variable = await apiClient.createGlobalVariable(payload)
        setVariables((prev) => [variable, ...prev])
        return variable
      } catch (err: any) {
        setError(err?.message || "Failed to create variable")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchVariables]
  )

  // Update an existing variable
  const updateVariable = useCallback(
    async (id: number, data: { name: string; value: string; description?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const payload = {
          name: data.name,
          type: "global",
          value_json: { value: data.value },
          description: data.description,
        }
        const variable = await apiClient.updateVariable(id, payload)
        setVariables((prev) => prev.map((v) => (v.id === id ? variable : v)))
        return variable
      } catch (err: any) {
        setError(err?.message || "Failed to update variable")
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Delete a variable
  const deleteVariable = useCallback(
    async (id: number) => {
      setLoading(true)
      setError(null)
      try {
        await apiClient.deleteVariable(id)
        setVariables((prev) => prev.filter((v) => v.id !== id))
      } catch (err: any) {
        setError(err?.message || "Failed to delete variable")
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Refresh variables list
  const refresh = useCallback(() => {
    fetchVariables()
  }, [fetchVariables])

  const value = useMemo(
    () => ({
      variables,
      loading,
      error,
      refresh,
      createVariable,
      updateVariable,
      deleteVariable,
    }),
    [variables, loading, error, refresh, createVariable, updateVariable, deleteVariable]
  )

  return (
    <GlobalVariablesContext.Provider value={value}>
      {children}
    </GlobalVariablesContext.Provider>
  )
}

// Hook
export function useGlobalVariables() {
  const ctx = useContext(GlobalVariablesContext)
  if (!ctx) throw new Error("useGlobalVariables must be used within a GlobalVariablesProvider")
  return ctx
}
