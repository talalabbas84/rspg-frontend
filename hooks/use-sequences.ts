"use client"

import { useState, useEffect } from "react"
import type { Sequence } from "@/types"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"


export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSequences = async () => {
    try {
      setLoading(true)
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      const mockSequences: Sequence[] = [
        { id: "1", name: "test", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: "2", name: "demo", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: "3", name: "Test1", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: "4", name: "sequence", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: "5", name: "Test April 17", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: "6", name: "SEQUENCE TEST", created_at: "2024-01-01", updated_at: "2024-01-01" },
      ]

      setSequences(mockSequences)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sequences")
    } finally {
      setLoading(false)
    }
  }

  const createSequence = async (data: { name: string; description?: string }) => {
    try {
      const newSequence = await apiClient.createSequence(data)
      setSequences((prev) => [...prev, newSequence])
      return newSequence
    } catch (err: any) {
      toast.error("Failed to create sequence", { description: err.message })
      throw err
    }
  }

  const updateSequence = async (id: string, data: { name?: string; description?: string }) => {
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedSequence = sequences.find((seq) => seq.id === id)
      if (!updatedSequence) throw new Error("Sequence not found")

      const updated = {
        ...updatedSequence,
        ...data,
        updated_at: new Date().toISOString(),
      }

      setSequences((prev) => prev.map((seq) => (seq.id === id ? updated : seq)))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sequence")
      throw err
    }
  }

  const deleteSequence = async (id: string) => {
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      setSequences((prev) => prev.filter((seq) => seq.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sequence")
      throw err
    }
  }

  useEffect(() => {
    fetchSequences()
  }, [])

  return {
    sequences,
    loading,
    error,
    createSequence,
    updateSequence,
    deleteSequence,
    refetch: fetchSequences,
  }
}
