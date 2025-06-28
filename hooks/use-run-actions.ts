import { useState, useCallback } from "react"
import { apiClient } from "@/lib/api"
import type { Run, BlockRun } from "@/types"

// Accepts sequenceId as string, and an optional inputOverrides object
export function useRunActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Full sequence run (payload must include input_overrides if you want to send context)
  const runSequence = useCallback(
    async (
      sequenceId: string,
      inputOverrides?: Record<string, any>
    ): Promise<Run | undefined> => {
      setLoading(true)
      setError(null)
      try {
        // If no overrides, still send empty object as payload
        return await apiClient.runSequence(sequenceId,  inputOverrides || {} )
      } catch (err: any) {
        setError(err.message || "Failed to run sequence")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Single block run (unchanged)
  const runBlock = useCallback(
    async (
      blockId: string,
      inputOverrides?: Record<string, any>
    ): Promise<BlockRun | undefined> => {
      setLoading(true)
      setError(null)
      try {
        return await apiClient.runBlock(blockId, inputOverrides || {})
      } catch (err: any) {
        setError(err.message || "Failed to run block")
      } finally {
        setLoading(false)
      }
    },
    []
  )



  const getRunsForSequence = useCallback(
  async (sequenceId: string): Promise<Run[] | undefined> => {
    setLoading(true)
    setError(null)
    try {
      return await apiClient.getRunsBySequence(sequenceId)
    } catch (err: any) {
      setError(err.message || "Failed to fetch runs for sequence")
    } finally {
      setLoading(false)
    }
  },
  []
)




    // Edit block output (for editing a block run's response)
  const editBlockOutput = useCallback(
    async (
      runId: string,
      blockRunId: string,
      newOutput: Record<string, any>
    ): Promise<BlockRun | undefined> => {
      setLoading(true)
      setError(null)
      try {
        return await apiClient.editBlockOutput(runId, blockRunId, newOutput)
      } catch (err: any) {
        setError(err.message || "Failed to update block output")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Preview prompt (unchanged)
  const previewPrompt = useCallback(
    async (
      blockId: string,
      inputOverrides?: Record<string, any>
    ): Promise<string | undefined> => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiClient.previewPrompt(blockId, inputOverrides || {})
        return res.rendered_prompt
      } catch (err: any) {
        setError(err.message || "Failed to preview prompt")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const rerunFromBlock = useCallback(
  async (runId: string, blockId: string, inputOverrides?: Record<string, any>): Promise<Run | undefined> => {
    setLoading(true)
    setError(null)
    try {
      return await apiClient.rerunFromBlock(runId, blockId, inputOverrides || {})
    } catch (err: any) {
      setError(err.message || "Failed to rerun from block")
    } finally {
      setLoading(false)
    }
  },
  []
)

  return {
    loading,
    error,
    runSequence,
    runBlock,
    rerunFromBlock,
    editBlockOutput,
    previewPrompt,
    getRunsForSequence,
  }
}
