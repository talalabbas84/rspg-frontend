"use client";

import { useEffect, useState } from "react";
import type { Block, BlockResponse } from "@/types";
import { DragDropBlockResponsePair } from "./drag-drop-block-response-pair";
import { useBlocks } from "@/hooks/use-blocks";
import { useRunActions } from "@/hooks/use-run-actions";
import { apiClient } from "@/lib/api";

interface DragDropBlockResponsePairsProps {
  sequenceId: string;
  onEditBlock?: (block: Block) => void;
}

export function DragDropBlockResponsePairs({
  sequenceId,
  onEditBlock,
}: DragDropBlockResponsePairsProps) {
  const { blocks } = useBlocks(sequenceId);
  const [liveBlockResponses, setLiveBlockResponses] = useState<{
    [blockId: string]: BlockResponse & { isLive: true };
  }>({});

  const { runSequence, loading, getRunsForSequence, rerunFromBlock, runBlock } =
    useRunActions();

  const [isRunning, setIsRunning] = useState(false);
  const [sequenceRunResult, setSequenceRunResult] = useState<any>(null);
  const [inputOverrides, setInputOverrides] = useState<{ [k: string]: string }>(
    {}
  );

  useEffect(() => {
    async function fetchLatestRun() {
      try {
        const runs = await getRunsForSequence(sequenceId);
        if (runs && runs.length > 0) {
          // You may want to pick the latest COMPLETED run, not just the first.
          // Assuming runs are sorted newest-to-oldest, or sort manually:
          const latestRun = runs
            .filter((r) => r.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0];
          if (latestRun) {
            // Fetch full details including block_runs:
            const details = await apiClient.getRunDetails(String(latestRun.id));
            setSequenceRunResult(details);
          }
        } else {
          setSequenceRunResult(null); // No runs yet
        }
      } catch (e) {
        setSequenceRunResult(null); // handle error, optionally show toast
      }
    }
    fetchLatestRun();
  }, [sequenceId, getRunsForSequence]);
  // Global: Run sequence and save results
  async function handleRunFullSequence() {
    setIsRunning(true);
    try {
      const run = await runSequence(sequenceId, inputOverrides);
      setSequenceRunResult(run);
      setLiveBlockResponses({}); // Clear ephemeral responses!
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRerunFromBlock(blockId: string) {
    if (!sequenceRunResult?.id) return;
    setIsRunning(true);
    try {
      // inputOverrides: send only overrides for relevant variables if you want
      const newRun = await rerunFromBlock(
        String(sequenceRunResult.id),
        String(blockId),
        inputOverrides
      );
      setSequenceRunResult(newRun);
    } finally {
      setIsRunning(false);
    }
  }

  // Allow block components to update shared inputOverrides
  function handleInputOverrideChange(varName: string, value: string) {
    setInputOverrides((prev) => ({ ...prev, [varName]: value }));
  }
  function mapApiBlockRunToBlockResponse(
    res: any,
    blockId: string,
    inputs?: Record<string, string>
  ) {
    return {
      id: `live-${blockId}`,
      blockId: String(res.block_id ?? blockId),
      blockRunId: res.id ?? res.blockRunId ?? null, // <- this line
      content: res.llm_output_text ?? "",
      outputs: res.named_outputs_json ?? {},
      matrix_output: res.matrix_outputs_json ?? {},
      list_output: res.list_outputs_json?.values ?? [],
      editedAt: res.completed_at ?? null,
      isLive: true,
      runId: res.run_id ?? null,
      inputs,
    };
  }

  // For a given block, return its run output (if any)
  function getBlockRunResponse(block: Block) {
    if (!sequenceRunResult?.block_runs) return null;
    const blockRun = sequenceRunResult.block_runs.find(
      (br: any) => br.block_id === block.id
    );
    if (!blockRun) return null;
    return {
      id: `response-${block.id}`,
      blockRunId: blockRun.id,
      blockId: String(block.id),
      content: blockRun.llm_output_text || "No output",
      prompt_text: blockRun.prompt_text || "", // <-- add this line!
      outputs: blockRun.named_outputs_json,
      matrix_output: blockRun.matrix_outputs_json,
      editedAt: blockRun.completed_at,
      list_output: blockRun.list_outputs_json?.values ?? [], // <--- add this line!
    };
  }

  async function refetchLatestRun() {
    try {
      const details = await apiClient.getRunDetails(
        String(sequenceRunResult.id)
      );

      setSequenceRunResult(details);
    } catch (e) {
      // handle error if needed
    }
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="p-4 text-gray-500 bg-gray-50 border-dashed border-2 border-gray-200 text-center">
        No blocks found in this sequence.
      </div>
    );
  }

  console.log(sequenceRunResult, "sequenceRunResult");

  return (
    <div className="space-y-8">
      {/* Global "Run Sequence" */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleRunFullSequence}
          disabled={isRunning || loading}
          className="bg-green-600 text-white rounded px-4 py-2 shadow"
        >
          {isRunning || loading ? "Running..." : "Run Full Sequence"}
        </button>
      </div>
      {blocks.map((block) => {
        // fallback: the DB/API response for this block, if any
        const fallbackResponse = getBlockRunResponse(block);
        // live: ephemeral result (if any)
        const liveResponse = liveBlockResponses[block.id];

        // The response we'll show
        const blockResponse = liveResponse ?? fallbackResponse;

        // Always patch in runId from current sequence
        // Always patch in blockRunId (from live or fallback)
        return (
          <DragDropBlockResponsePair
            key={block.id}
            block={block}
            onEdit={onEditBlock}
            onRunBlock={async (blockId, inputs) => {
              setIsRunning(true);
              try {
                const res = await runBlock(blockId, inputs);
                setLiveBlockResponses((prev) => ({
                  ...prev,
                  [blockId]: mapApiBlockRunToBlockResponse(
                    res,
                    blockId,
                    inputs
                  ),
                }));
              } finally {
                setIsRunning(false);
              }
            }}
            refetchRun={refetchLatestRun}
            setLiveBlockResponses={setLiveBlockResponses}
            onInputOverrideChange={handleInputOverrideChange}
            inputOverrides={inputOverrides}
            onRerunFromBlock={handleRerunFromBlock}
            setInputOverrides={setInputOverrides}
            response={
              blockResponse
                ? {
                    ...blockResponse,
                    runId: sequenceRunResult?.id ?? blockResponse.runId ?? null,
                    prompt_text: (() => {
                      // 1. Use fallback prompt_text if available
                      if (fallbackResponse && fallbackResponse.prompt_text)
                        return fallbackResponse.prompt_text;
                      // 2. Look for a matching block_run and extract prompt_text
                      const blockRun = sequenceRunResult?.block_runs?.find(
                        (br: any) => String(br.block_id) === String(block.id)
                      );
                      if (blockRun && blockRun.prompt_text)
                        return blockRun.prompt_text;
                      // 3. fallback: empty string
                      return "";
                    })(),
                    blockRunId: blockResponse.blockRunId ?? null,
                    blockRuns: sequenceRunResult?.block_runs || [], // <-- add this
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
