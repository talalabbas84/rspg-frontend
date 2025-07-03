"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X, Plus, Trash2 } from "lucide-react";
import type { Block, BlockType, MultiListConfigItem } from "@/types";
import { EnhancedAutocompleteTextarea } from "@/components/ui/enhanced-autocomplete-textarea";
import { useAvailableVariables } from "@/hooks/use-available-variables";

interface EditBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onUpdate: (payload: any) => void;
}

export function EditBlockModal({
  open,
  onOpenChange,
  block,
  onUpdate,
}: EditBlockModalProps) {
  // ---- Initial state from block ----
  const [name, setName] = useState("");
  const [model, setModel] = useState("claude-3-5-sonnet-latest");
  const [prompt, setPrompt] = useState("");
  const [outputName, setOutputName] = useState("");
  // Discretization
  const [numOutputs, setNumOutputs] = useState(1);

  // Single List
  const [inputListName, setInputListName] = useState("");
  // Multi List
  const [multiListConfigs, setMultiListConfigs] = useState<
    MultiListConfigItem[]
  >([{ id: "1", name: "", priority: 1 }]);
  // Block Type (could also be passed in as a prop if you want to force lock it)
  const blockType: BlockType = block?.type || "standard";

  const { variables } = useAvailableVariables(block?.sequence_id);

  // ---- Populate state when block changes ----
  useEffect(() => {
    if (!block) return;
    setName(block.name || "");
    setModel(block.llm_model_override || "claude-3-5-sonnet-latest");

    // Pull config from block.config_json, handling all types
    if (block.type === "standard" && block.config_json) {
      setPrompt(block.config_json.prompt ?? "");
      setOutputName(block.config_json.output_variable_name ?? "");
    } else if (block.type === "discretization" && block.config_json) {
      setPrompt(block.config_json.prompt ?? "");
      setNumOutputs(block.config_json.output_names?.length ?? 1);
      setOutputName(""); // clear, not used for this type
    } else if (block.type === "single_list" && block.config_json) {
      setPrompt(block.config_json.prompt ?? "");
      setInputListName(block.config_json.input_list_variable_name ?? "");
      setOutputName(block.config_json.output_list_variable_name ?? "");
    } else if (block.type === "multi_list" && block.config_json) {
      setPrompt(block.config_json.prompt ?? "");
      setMultiListConfigs(
        (block.config_json.input_lists_config ?? []).map(
          (item: any, idx: number) => ({ id: idx.toString(), ...item })
        )
      );
      setOutputName(block.config_json.output_matrix_variable_name ?? "");
    }
    // eslint-disable-next-line
  }, [block, open]);


  // --- Multi-list configs handlers ---
  const addMultiListConfig = () => {
    setMultiListConfigs((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", priority: prev.length + 1 },
    ]);
  };
  const updateMultiListConfig = (
    id: string,
    field: keyof MultiListConfigItem,
    value: string | number
  ) => {
    setMultiListConfigs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };
  const removeMultiListConfig = (id: string) =>
    setMultiListConfigs((prev) => prev.filter((item) => item.id !== id));

  // --- Build config_json for backend ---
  function buildConfigJson(): any {
    if (blockType === "standard") {
      return {
        prompt,
        output_variable_name: outputName,
      };
    } else if (blockType === "discretization") {
      return {
        prompt,
         output_names: Array.from({ length: numOutputs }, (_, i) => `output_${i + 1}`),
      };
    } else if (blockType === "single_list") {
      return {
        prompt,
        input_list_variable_name: inputListName,
        output_list_variable_name: outputName,
      };
    } else if (blockType === "multi_list") {
      return {
        prompt,
        input_lists_config: multiListConfigs
          .filter((l) => l.name.trim())
          .map(({ id, ...rest }) => rest),
        output_matrix_variable_name: outputName,
      };
    } else {
      return {}; // fallback
    }
  }

  // --- Submit handler ---
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!block) return;

    const payload = {
      ...block,
      name,
      llm_model_override: model,
      config_json: buildConfigJson(),
    };
    onUpdate(payload);
    onOpenChange(false);
  }

  // --- UI helpers ---
  const getBlockTypeDescription = () => {
    switch (blockType) {
      case "standard":
        return "A standard AI block that processes a single prompt and returns a response.";
      case "discretization":
        return "Splits complex outputs into multiple named variables.";
      case "single_list":
        return "Applies the prompt to each item in a list and collects results.";
      case "multi_list":
        return "Compares or relates items from multiple lists, producing a matrix of results.";
      default:
        return "";
    }
  };
  const listOptions = variables.filter((v) => v.type === "list");

  if (!block) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                Edit {blockType.replace("_", " ")} Block
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {getBlockTypeDescription()}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Block Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-sonnet-latest">
                      Claude 3.5 Sonnet
                    </SelectItem>
                    <SelectItem value="claude-3-5-haiku-latest">
                      Claude 3.5 Haiku
                    </SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Block-Type Specific Config */}
          {blockType === "discretization" && (
            <Card className="p-4">
              <h3 className="font-medium mb-4">Discretization Configuration</h3>
              <Label>Number of Outputs</Label>
              <Input
                type="number"
                min={1}
                value={numOutputs}
                onChange={(e) => setNumOutputs(Number(e.target.value))}
                className="w-32"
              />
            </Card>
          )}

          {blockType === "single_list" && (
            <Card className="p-4">
              <h3 className="font-medium mb-4">Single List Configuration</h3>
              <Label>Input List Name</Label>
              <Select value={inputListName} onValueChange={setInputListName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a list..." />
                </SelectTrigger>
                <SelectContent>
                  {listOptions.length === 0 ? (
                    <div className="p-2 text-gray-500">No lists available.</div>
                  ) : (
                    listOptions.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <p className="text-xs text-gray-600 mt-1">
                The prompt will be applied to each item in this list.
              </p>
            </Card>
          )}

          {blockType === "multi_list" && (
            <Card className="p-4">
              <h3 className="font-medium mb-4">Multi List Configuration</h3>
              <p className="text-sm text-gray-600 mb-2">
                Configure lists to compare. Priority 1 is the primary list.
              </p>
              {multiListConfigs.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-end mb-2">
                  <div className="flex-1">
                    <Label>List Name</Label>
                    <Select
                      value={item.name}
                      onValueChange={(value) =>
                        updateMultiListConfig(item.id, "name", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {listOptions.length === 0 ? (
                          <div className="p-2 text-gray-500">
                            No lists available.
                          </div>
                        ) : (
                          listOptions.map((option) => (
                            <SelectItem key={option.label} value={option.label}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.priority}
                      onChange={(e) =>
                        updateMultiListConfig(
                          item.id,
                          "priority",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  {multiListConfigs.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMultiListConfig(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMultiListConfig}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add List
              </Button>
            </Card>
          )}
          {/* Prompt & Output */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Prompt Configuration</h3>
            <div className="space-y-4">
              <div>
                <Label>Prompt</Label>
                <EnhancedAutocompleteTextarea
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="Enter your prompt here..."
                  options={variables}
                  rows={6}
                />
              </div>
              {/* Output name not needed for discretization */}
              {blockType !== "discretization" && (
                <div>
                  <Label>Output Name</Label>
                  <Input
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="e.g., processed_claims"
                    required
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Block</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
