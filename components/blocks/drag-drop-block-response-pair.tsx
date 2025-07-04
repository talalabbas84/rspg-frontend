"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, EyeOff, Loader2, Sparkles, Zap, Menu } from "lucide-react";
import type { Block } from "@/types";
import { EditGlobalVariableModal } from "@/components/modals/edit-global-variable-modal";
import { AddVariableModal } from "@/components/modals/add-variable-modal";
import { CreateInputVariableModal } from "@/components/modals/create-input-variable-modal";
import { EditableResponse } from "./editable-response";
import { DroppableVariableSection } from "@/components/ui/droppable-variable-section";
import { EnhancedAutocompleteTextarea } from "@/components/ui/enhanced-autocomplete-textarea";
import { useAvailableVariables } from "@/hooks/use-available-variables";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DraggableVariableChip } from "@/components/ui/draggable-variable-chip";
import { useRunActions } from "@/hooks/use-run-actions";
import { InlineGlobalVariableInput } from "../variables/inline-global-variable-input";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { useToast } from "../ui/use-toast";
import { EditListVariableDialog } from "../modals/edit-block-modal";

interface BlockResponse {
  id: string;
  blockId: string;
  content: string;
  outputs?: { [key: string]: string };
  matrix_output?: { [key: string]: { [key: string]: string } };
  editedAt?: string;
  runId?: string; // <--- add this!
}
interface BlockResponsePairProps {
  block: Block;
  response?: BlockResponse | null;
  onEdit?: (block: Block) => void;
  onDelete?: (blockId: string) => void;
  onInputOverrideChange: (varName: string, value: string) => void;
  inputOverrides: { [k: string]: string };
  refetchRun?: () => void; // Optional, if parent needs to refresh run state
  setLiveBlockResponses: (
    responses: Record<string, BlockResponse & { isLive: boolean }>
  ) => void;
  onRunBlock?: (
    blockId: string,
    inputs: Record<string, string>
  ) => Promise<void>;
  onRerunFromBlock?: (
    runId: string,
    blockId: string,
    overrides: Record<string, string>
  ) => Promise<void>;
  setInputOverrides: (overrides: Record<string, string>) => void; // Allow parent to update input overrides
}
export function DragDropBlockResponsePair({
  block,
  response,
  onEdit,
  onDelete,
  onInputOverrideChange,
  inputOverrides,
  onRerunFromBlock,
  refetchRun,
  setLiveBlockResponses,
  onRunBlock,
  setInputOverrides,
}: BlockResponsePairProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [showCreateVariable, setShowCreateVariable] = useState(false);
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false);

  const [editGlobalVar, setEditGlobalVar] = useState<string | null>(null);
  const [editGlobalVarDefault, setEditGlobalVarDefault] = useState<string>("");
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [editListVar, setEditListVar] = useState<string | null>(null);
  const [listVarDraft, setListVarDraft] = useState<string[]>([]);
  const [editingVarName, setEditingVarName] = useState<string>("");

  const { toast } = useToast();
  const [currentPrompt, setCurrentPrompt] = useState(
    block.config_json?.prompt || block.prompt || ""
  );

  const { variables } = useAvailableVariables(block.sequence_id);
  const { runBlock, rerunFromBlock, loading, editBlockOutput } =
    useRunActions();

  // --- DnD logic for variable chips ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  function extractVars(prompt: string) {
    const regex = /<<([^>]+)>>/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(prompt)) !== null) matches.push(match[1]);
    return matches;
  }
  const [usedVariables, setUsedVariables] = useState<any[]>([]);

  useEffect(() => {
    const foundVars = extractVars(currentPrompt);
    setUsedVariables(
      foundVars.map((name) => ({
        id: name,
        name,
        label: name,
        value: variables.find((v) => v.label === name)?.value || "",
        defaultValue: variables.find((v) => v.label === name)?.value || "",
        type: variables.find((v) => v.label === name)?.type || "global",
        description: `Variable: ${name}`,
      }))
    );
  }, [currentPrompt, variables]);
  // --- end DnD logic ---

  // --- Drag and drop logic for variable chips
  const handleDragStart = (event: DragStartEvent) =>
    setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = usedVariables.findIndex((v) => v.name === active.id);
    const newIndex = usedVariables.findIndex((v) => v.name === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(usedVariables, oldIndex, newIndex);
      setUsedVariables(newOrder);
      // Optionally update prompt string
      let basePrompt = currentPrompt;
      usedVariables.forEach((v) => {
        basePrompt = basePrompt.replace(new RegExp(`<<${v.name}>>`, "g"), "");
      });
      basePrompt = basePrompt.replace(/\s+/g, " ").trim();
      const newPrompt =
        basePrompt + " " + newOrder.map((v) => `<<${v.name}>>`).join(" ");
      setCurrentPrompt(newPrompt.trim());
    }
  };
  // --- end drag logic ---

  // --- UI helpers ---
  const getBadgeColor = (blockType: string) => {
    switch (blockType) {
      case "standard":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "discretization":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "single_list":
        return "bg-green-100 text-green-800 border-green-200";
      case "multi_list":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  useEffect(() => {
    setInputOverrides((prev) => {
      const updated = { ...prev };
      usedVariables.forEach((v) => {
        if (updated[v.name] == null || updated[v.name] === "") {
          updated[v.name] =
            getPrevBlockOutput(v.name) ?? v.defaultValue ?? v.value ?? "";
        }
      });
      return updated;
    });
  }, [usedVariables]);

  const getBadgeLabel = (blockType: string) => {
    switch (blockType) {
      case "standard":
        return "AI Block";
      case "discretization":
        return "Discretization";
      case "single_list":
        return "Single List";
      case "multi_list":
        return "Multi List";
      default:
        return "Unknown";
    }
  };
  const getBlockIcon = (blockType: string) => {
    switch (blockType) {
      case "standard":
        return <Sparkles className="h-4 w-4" />;
      case "discretization":
        return <Zap className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  function getPrevBlockOutput(variableName) {
    // sequenceRunResult/block_runs should be passed down or accessible
    if (!response || !response.runId || !response.blockId) return undefined;
    // Find block runs before this block
    const blockRuns = response.blockRuns || []; // You need to pass this as a prop
    if (!blockRuns.length) return undefined;
    // Find the most recent block_run with this output
    for (let i = blockRuns.length - 1; i >= 0; i--) {
      const br = blockRuns[i];

      if (
        br.completed_at &&
        br.named_outputs_json &&
        br.named_outputs_json[variableName] !== undefined
      ) {
        return br.named_outputs_json[variableName];
      }
    }
    return undefined;
  }

  // --- Block Actions ---
  const handleEdit = () => onEdit?.(block);
  const handleDelete = () => {
    if (confirm("Are you sure?")) onDelete?.(block.id);
  };

  // --- Variable Actions ---
  const handleAddVariable = (variable: string) =>
    setCurrentPrompt(
      (prev) => prev + (prev ? " " : "") + `<<${variable.name}>>`
    );
  const handleRemoveVariable = (name: string) => {
    setCurrentPrompt((prev) =>
      prev
        .replace(new RegExp(`<<${name}>>`, "g"), "")
        .replace(/\s+/g, " ")
        .trim()
    );
  };

  const handleVariableClick = (variable: string) =>
    setSelectedVariable(variable);
  // --- Output/Run Button Section ---
  // In parent component, on block run:
  // setLiveBlockResponses((prev) => ({
  //   ...prev,
  //   [block.id]: {
  //     id: `live-${block.id}`,
  //     blockId: String(block.id),
  //     content: res.llm_output_text ?? "", // <<--- map correctly!
  //     outputs: res.named_outputs_json ?? {},
  //     matrix_output: res.matrix_outputs_json ?? {},
  //     list_output: res.list_outputs_json ?? null,
  //     editedAt: res.completed_at ?? null,
  //     isLive: true,
  //     runId: res.run_id ?? null,
  //     blockRunId: res.id ?? null,
  //     inputs,
  //   },
  // }));

  // Utility to get output variable name (from block config or default)
  function getOutputVariable(block: Block): string {
    return (
      block.config_json?.output_variable ||
      block.config_json?.output_variable_name ||
      block.config_json?.output_name ||
      block.name?.replace(/\s+/g, "_").toLowerCase() ||
      "main_output"
    );
  }

  const handleEditResponse = async (editedResponse) => {
    if (!response?.runId || !response?.blockRunId) {
      toast({ title: "Missing run info", variant: "destructive" });
      return;
    }

    let named_outputs_json;

    const payload: any = {};
    if (block.type === "standard") {
      const outputVar = getOutputVariable(block);
      payload.named_outputs_json = {
        [outputVar]: editedResponse.content ?? response.content ?? "",
      };
      payload.llm_output_text =
        editedResponse.content ?? response.content ?? null;
    } else if (block.type === "discretization") {
      payload.named_outputs_json =
        editedResponse.outputs ?? response.outputs ?? {};
    } else if (block.type === "single_list") {
      payload.list_outputs_json = {
        values: editedResponse.list_output ?? response.list_output ?? [],
      };
    } else if (block.type === "multi_list" || block.type === "matrix") {
      payload.matrix_outputs_json =
        editedResponse.matrix_output ?? response.matrix_output ?? {};
    }

    // Remove any nulls
    Object.keys(payload).forEach(
      (k) => payload[k] == null && delete payload[k]
    );

    try {
      const res = await editBlockOutput(
        response.runId,
        response.blockRunId,
        payload
      );
      // if (!res) throw new Error("Failed to edit response");
      if (block.type === "standard") {
        const outputVar = getOutputVariable(block);
        setInputOverrides((prev) => ({
          ...prev,
          [outputVar]: editedResponse.content,
        }));
      } else if (block.type === "discretization") {
        // If you have multiple outputs, set them all
        Object.entries(editedResponse.outputs || {}).forEach(([k, v]) => {
          setInputOverrides((prev) => ({
            ...prev,
            [k]: v,
          }));
        });
      }
      await refetchRun?.();
      toast({
        title: "Response updated",
        description: "The block response has been successfully edited.",
      });
    } catch (e) {
      toast({
        title: "Error editing response",
        description: String(e),
        variant: "destructive",
      });
    }
  };


  function getOutputVariables(block) {
    if (!block?.config_json) return [];
    if (
      block.type === "discretization" &&
      Array.isArray(block.config_json.output_names)
    ) {
      return block.config_json.output_names;
    }
    // Multi output (if you ever support) can be handled here
    // Standard: single output var
    return [
      block.config_json.output_variable ||
        block.config_json.output_variable_name ||
        block.config_json.output_name ||
        (block.name
          ? block.name.replace(/\s+/g, "_").toLowerCase()
          : "main_output"),
    ].filter(Boolean);
  }

  // --- UI Render ---
  const activeVariable = activeId
    ? usedVariables.find((v) => v.name === activeId)
    : null;

  if (!block || !variables) {
    return null;
  }

  if (!block) return null;
  // if (!response) {
  //   // Optionally show placeholder, or nothing
  //   return <div className="p-4 text-gray-500">No response available.</div>;
  // }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col xl:grid xl:grid-cols-2 gap-4 xl:gap-6 items-start">
        {/* Block Card */}
        <Card className="p-4 sm:p-6 w-full bg-white border border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {getBlockIcon(block.type)}
              <Input
                value={block.name}
                className="font-medium border-none shadow-none p-0 h-auto text-sm sm:text-base bg-transparent min-w-0 flex-1"
                readOnly
              />
              <Badge
                variant="outline"
                className={`px-2 sm:px-3 py-1 border text-xs sm:text-sm whitespace-nowrap ${getBadgeColor(
                  block.type
                )}`}
              >
                {getBadgeLabel(block.type)}
              </Badge>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                // disabled={!!response?.isLive}
                title={
                  response?.isLive ? "Only editable for saved runs" : "Edit"
                }
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!response?.editedAt || !response.blockId) return;
                  if (!response.runId) return; // We'll add runId below!
                  setIsRunning(true);
                  try {
                    // Parent component should provide a handler for rerun
                    await onRerunFromBlock?.(response.blockId);
                  } finally {
                    setIsRunning(false);
                  }
                }}
              >
                <Zap className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Special Configs */}
          {/* {block.type === "discretization" &&
            block.config_json?.output_names && (
              <div className="mt-2">
                <label className="text-xs font-semibold">Output Names:</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {block.config_json.output_names.map((n: string) => (
                    <Badge key={n} className="border">
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>
            )} */}
          {/* --- List Variables Editable Section --- */}
          {usedVariables
            .filter((variable) => variable.type === "list")
            .map((variable) => (
              <div key={variable.name} className="flex items-center gap-2 mb-2">
                <span className="w-32 text-xs">{variable.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingVarName(variable.name);
                    setListVarDraft(inputOverrides[variable.name] || []);
                    setEditListVar(variable.name);
                  }}
                >
                  Edit List
                </Button>
                <span className="text-xs text-gray-500">
                  {Array.isArray(inputOverrides[variable.name])
                    ? inputOverrides[variable.name].join(", ")
                    : ""}
                </span>
                <EditListVariableDialog
                  open={editListVar === variable.name}
                  onOpenChange={() => setEditListVar(null)}
                  initialList={listVarDraft}
                  variableName={variable.name}
                  onSave={(newList) => {
                    onInputOverrideChange(variable.name, newList);
                    setEditListVar(null);
                  }}
                />
              </div>
            ))}

          {/* --- Non-list (Single Value) Variables Section --- */}
          {usedVariables.filter((variable) => variable.type !== "list").length >
            0 && (
            <div className="space-y-2 mt-4">
              <label className="text-xs font-semibold">Required Inputs</label>
              <div className="flex flex-col gap-2">
                {usedVariables
                  .filter((variable) => variable.type !== "list")
                  .map((variable) => (
                    <div
                      key={variable.name}
                      className="flex items-center gap-2"
                    >
                      <span className="w-32 text-xs">{variable.name}</span>
                      <Textarea
                        value={
                          inputOverrides[variable.name] ??
                          getPrevBlockOutput(variable.name) ??
                          variable.defaultValue ?? // If override not set, use default
                          variable.value ?? // If default not set, use value
                          ""
                        }
                        placeholder={`Enter value for "${variable.name}"`}
                        onChange={(e) =>
                          onInputOverrideChange(variable.name, e.target.value)
                        }
                        rows={1}
                        className="text-xs"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => {
              const name = prompt("Enter list variable name");
              if (name) {
                setEditingVarName(name);
                setListVarDraft([]);
                setEditListVar(name);
              }
            }}
          >
            + Add List Variable
          </Button>

          {/* DnD Variables Used */}
          <DroppableVariableSection
            variables={usedVariables}
            title="Variables Used in Prompt"
            onAddVariable={() => setShowAddVariable(true)}
            onRemoveDragDropBlockResponsePairVariable={handleRemoveVariable}
            onViewVariable={handleVariableClick}
            onReorderVariables={setUsedVariables}
            onUpdatePrompt={setCurrentPrompt}
            collapsible
            defaultOpen
            emptyMessage="No variables used in this prompt"
            className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50/50"
            droppableId="used-variables"
            currentPrompt={currentPrompt}
          />

          {/* Prompt (editable) */}
          {/* Prompt (editable) */}
          <div className="space-y-3 mt-2">
            <label className="text-xs font-semibold">Prompt</label>
            <EnhancedAutocompleteTextarea
              value={currentPrompt}
              onChange={setCurrentPrompt}
              placeholder="Prompt content..."
              className="min-h-[80px] sm:min-h-[100px] bg-gray-50 text-xs"
              options={variables}
              onVariableClick={handleVariableClick}
              disabled={false}
              rows={3}
            />
            {/* Output Variable Labels */}
            <div className="space-y-1 mt-2">
              <label className="text-xs font-semibold">
                Output Variable{getOutputVariables(block).length > 1 ? "s" : ""}
              </label>
              <div className="flex gap-2 flex-wrap">
                {getOutputVariables(block).map((varName) => (
                  <Badge
                    key={varName}
                    className="border bg-yellow-50 text-yellow-800 border-yellow-200 text-xs"
                  >
                    {varName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-3">
              <label className="text-xs font-semibold">
                Compiled Prompt Preview:
              </label>
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 break-all">
                {currentPrompt.replace(/<<(\w+)>>/g, (match, variable) => {
                  const foundVar = variables?.find((v) => v.label === variable);
                  return foundVar
                    ? `[${foundVar.value}: ${foundVar.type}]`
                    : `[${variable}: unknown]`;
                })}
              </div>
            </div>
          )}

          {/* Block Run Button */}
          <div className="flex flex-col gap-2 mt-3">
            <Button
              onClick={() => {
                const inputs: Record<string, string> = {};
                usedVariables.forEach((v) => {
                  inputs[v.name] = inputOverrides[v.name] || "";
                });
                onRunBlock?.(block.id, inputs);
              }}
              disabled={isRunning || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              {isRunning || loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Run This Block
            </Button>
          </div>
        </Card>
        {/* Response Card */}
        <Card className="p-4 sm:p-6 w-full bg-white border border-gray-200">
          <EditableResponse
            response={response}
            blockType={block.type}
            onUpdate={handleEditResponse}
            editable={!response?.isLive}
          />
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-base">Compiled Response</div>
            {/* Toggle button here */}
            {response?.prompt_text && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 mt-2"
                onClick={() => setShowCompiledPrompt((v) => !v)}
                title={
                  showCompiledPrompt
                    ? "Hide compiled prompt"
                    : "Show compiled prompt"
                }
              >
                {showCompiledPrompt ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
          {showCompiledPrompt && response?.prompt_text && (
            <pre className="text-xs bg-gray-50 rounded p-3 mb-3 border text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {response.prompt_text}
            </pre>
          )}
        </Card>
      </div>
      {/* DnD Chip Overlay */}
      <DragOverlay>
        {activeVariable ? (
          <DraggableVariableChip
            id={activeVariable.name}
            name={activeVariable.label ?? activeVariable.name} // for display
            type={activeVariable.type}
            description={activeVariable.description}
            value={activeVariable.value}
            showActions={false}
            className="rotate-3 shadow-lg"
          />
        ) : null}
      </DragOverlay>
      {/* Modals */}
      <AddVariableModal
        open={showAddVariable}
        onOpenChange={setShowAddVariable}
        onSelectVariable={handleAddVariable}
      />
      <CreateInputVariableModal
        open={showCreateVariable}
        onOpenChange={setShowCreateVariable}
        onCreateVariable={(variable) => {
          handleAddVariable(variable.name);
          setShowCreateVariable(false);
        }}
      />
      <EditGlobalVariableModal
        variableName={editGlobalVar}
        currentValue={editGlobalVarDefault}
        open={!!editGlobalVar}
        onClose={() => setEditGlobalVar(null)}
        onSave={async (newVal) => {
          setEditGlobalVar(null);
          setEditGlobalVarDefault("");
        }}
      />
    </DndContext>
  );
}
