"use client";

import { useState } from "react";
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
import { X, Plus, Trash2, Edit as EditIcon } from "lucide-react";
import type { BlockType, MultiListConfigItem } from "@/types";
import { EnhancedAutocompleteTextarea } from "@/components/ui/enhanced-autocomplete-textarea";
import { useAvailableVariables } from "@/hooks/use-available-variables";

interface EnhancedCreateBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockType: BlockType;
  sequenceId: string;
  onCreate: (data: any) => void;
}

export function EnhancedCreateBlockModal({
  open,
  onOpenChange,
  blockType,
  sequenceId,
  onCreate,
}: EnhancedCreateBlockModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [model, setModel] = useState("claude-3-5-sonnet-latest");
  const [prompt, setPrompt] = useState("");
  const [outputName, setOutputName] = useState("");

  // Discretization fields
  const [numOutputs, setNumOutputs] = useState(1);

  // Single List fields
  const [inputListName, setInputListName] = useState("");

  // Multi List fields
  const [multiListConfigs, setMultiListConfigs] = useState<
    MultiListConfigItem[]
  >([{ id: "1", name: "", priority: 1 }]);

  const { variables } = useAvailableVariables(sequenceId);

  // On-the-fly List Variable UI State
  const [listVars, setListVars] = useState<
    { name: string; values: string[] }[]
  >([]);
  const [showListVarDialog, setShowListVarDialog] = useState(false);
  const [editingListVarName, setEditingListVarName] = useState("");
  const [editingListVarValues, setEditingListVarValues] = useState<string[]>(
    []
  );

  // Multi-list configs
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

  // List Options: merge backend + new
  const listOptions = [
    ...variables.filter((v) => v.type === "list"),
    ...listVars.map((v) => ({
      label: v.name,
      value: v.label,
      type: "list",
      custom: true,
    })),
  ];


  // The important bit: merged autocomplete options for EnhancedAutocompleteTextarea
  const autocompleteOptions = [
    ...variables.map((v) => ({
      value: typeof v.value === "string" ? v.value : v.label,
      label: v.label,
      type: v.type,
      description: v.description,
    })),
    ...listVars
      .filter((lv) => !variables.some((v) => v.label === lv.name))
      .map((v) => ({
        value: v.name,
        label: v.name,
        type: "list",
        description: "Custom list variable",
        custom: true,
      })),
  ];

  // Build config_json for backend
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
      return {}; // fallback (should never happen)
    }
  }

  // Submit handler
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      type: blockType,
      model,
      sequence_id: Number(sequenceId),
      config_json: buildConfigJson(),
      list_vars: listVars, // attach custom list vars to payload if backend wants them
      order: 0,
    };

    onCreate(payload);
    onOpenChange(false);

    // Reset state
    setName("");
    setModel("claude-3-5-sonnet-latest");
    setPrompt("");
    setOutputName("");
    setNumOutputs(1);
    setInputListName("");
    setMultiListConfigs([{ id: "1", name: "", priority: 1 }]);
    setListVars([]);
  }

  // UI helpers
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                Creates {blockType.replace("_", " ")} Block
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {getBlockTypeDescription()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                  placeholder="Enter block name"
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
              <div className="flex gap-2 items-center">
                <Select value={inputListName} onValueChange={setInputListName}>
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
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {/* Edit button for custom vars */}
                {inputListName &&
                  listVars.some((v) => v.name === inputListName) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => {
                        const found = listVars.find(
                          (v) => v.name === inputListName
                        );
                        if (found) {
                          setEditingListVarName(found.name);
                          setEditingListVarValues(found.values);
                          setShowListVarDialog(true);
                        }
                      }}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => {
                    setEditingListVarName("");
                    setEditingListVarValues([]);
                    setShowListVarDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New List
                </Button>
              </div>
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
                    <div className="flex gap-2 items-center">
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
                              <SelectItem
                                key={option.label}
                                value={option.label}
                              >
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {/* Edit button for custom vars */}
                      {item.name &&
                        listVars.some((v) => v.name === item.name) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-2"
                            onClick={() => {
                              const found = listVars.find(
                                (v) => v.name === item.name
                              );
                              if (found) {
                                setEditingListVarName(found.name);
                                setEditingListVarValues(found.values);
                                setShowListVarDialog(true);
                              }
                            }}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                        )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setEditingListVarName("");
                          setEditingListVarValues([]);
                          setShowListVarDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> New List
                      </Button>
                    </div>
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
                  options={autocompleteOptions}
                  rows={6}
                />
              </div>
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
            <Button type="submit">Create Block</Button>
          </div>
        </form>

        {/* ----- Add/Edit List Variable Dialog ----- */}
        {showListVarDialog && (
          <Dialog open={showListVarDialog} onOpenChange={setShowListVarDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingListVarName
                    ? "Edit List Variable"
                    : "Add List Variable"}
                </DialogTitle>
              </DialogHeader>
              <div className="mb-2">
                <Label>List Name</Label>
                <Input
                  value={editingListVarName}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Disallow commas, square brackets, etc. (not allowed in variable names)
                    if (/,|\[|\]/.test(v)) return;
                    setEditingListVarName(v);
                  }}
                  placeholder="countries"
                  maxLength={40}
                />
              </div>
              <div className="mb-2">
                <Label>Values (one per line)</Label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={5}
                  value={editingListVarValues.join("\n")}
                  onChange={(e) =>
                    setEditingListVarValues(e.target.value.split("\n"))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowListVarDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setListVars((prev) => [
                      ...prev.filter((v) => v.name !== editingListVarName),
                      {
                        name: editingListVarName,
                        values: editingListVarValues,
                      },
                    ]);
                    setShowListVarDialog(false);
                  }}
                  disabled={
                    !editingListVarName || editingListVarValues.length === 0
                  }
                >
                  Save List
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
