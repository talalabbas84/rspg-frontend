import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useBlocks } from "@/hooks/use-blocks"
import { AddVariableModal } from "@/components/modals/add-variable-modal"
import { CreateInputVariableModal } from "@/components/modals/create-input-variable-modal"
import { EnhancedAutocompleteTextarea } from "@/components/ui/enhanced-autocomplete-textarea"
import { useAvailableVariables } from "@/hooks/use-available-variables"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import type { CreateBlockData, BlockType } from "@/types"

interface CreateBlockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blockType: BlockType
  sequenceId: string
}

export function CreateBlockModal({ open, onOpenChange, blockType, sequenceId }: CreateBlockModalProps) {
  // General block fields
  const [name, setName] = useState("")
  const [model, setModel] = useState("claude-3-5-sonnet-latest")
  const [prompt, setPrompt] = useState("")
  const [outputName, setOutputName] = useState("")
  // Block type specific config
  const [inputListName, setInputListName] = useState("") // For single_list
  const [outputVarNames, setOutputVarNames] = useState<string[]>([""]) // For discretization
  const [multiLists, setMultiLists] = useState<{ list_name: string; priority: number }[]>([{ list_name: "", priority: 1 }]) // For multi_list

  // UI state
  const [loading, setLoading] = useState(false)
  const { createBlock } = useBlocks(sequenceId)
  const { variables } = useAvailableVariables(sequenceId)

  // For adding/removing output variable fields (discretization)
  const handleOutputVarChange = (idx: number, value: string) => {
    setOutputVarNames(prev => prev.map((v, i) => (i === idx ? value : v)))
  }
  const addOutputVar = () => setOutputVarNames(prev => [...prev, ""])
  const removeOutputVar = (idx: number) => setOutputVarNames(prev => prev.filter((_, i) => i !== idx))

  // For adding/removing lists (multi_list)
  const handleMultiListChange = (idx: number, key: "list_name" | "priority", value: string | number) => {
    setMultiLists(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l))
  }
  const addMultiList = () => setMultiLists(prev => [...prev, { list_name: "", priority: prev.length + 1 }])
  const removeMultiList = (idx: number) => setMultiLists(prev => prev.filter((_, i) => i !== idx))

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Compose config_json based on blockType
    let config_json: any = {}
    if (blockType === "single_list") {
      config_json = {
        input_list_name: inputListName,
        prompt,
        output_name: outputName,
      }
    } else if (blockType === "discretization") {
      config_json = {
        output_variable_names: outputVarNames.filter(v => !!v.trim()),
        prompt,
        output_name: outputName,
      }
    } else if (blockType === "multi_list") {
      config_json = {
        lists: multiLists.filter(l => !!l.list_name.trim()),
        prompt,
        output_name: outputName,
      }
    } else {
      // standard or fallback
      config_json = {
        prompt,
        output_name: outputName,
      }
    }

    const payload: CreateBlockData = {
      sequence_id: sequenceId,
      name,
      type: blockType,
      model,
      prompt,
      order_index: 0, // You can set this as needed or let backend handle ordering
      config_json,
    }

    try {
      await createBlock(payload)
      onOpenChange(false)
      // Reset
      setName("")
      setPrompt("")
      setOutputName("")
      setInputListName("")
      setOutputVarNames([""])
      setMultiLists([{ list_name: "", priority: 1 }])
    } catch (err) {
      alert("Failed to create block")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creates {blockType.replace("_", " ")} Block</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Block Name */}
          <div>
            <Label>Block Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          {/* Model */}
          <div>
            <Label>Model</Label>
            <Select value={model} onValueChange={v => setModel(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</SelectItem>
                <SelectItem value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest</SelectItem>
                <SelectItem value="gpt-4">gpt-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Block-type specific config fields */}
          {blockType === "single_list" && (
            <div>
              <Label>Input List Name</Label>
              <Input value={inputListName} onChange={e => setInputListName(e.target.value)} placeholder="e.g. claim_types" />
            </div>
          )}

          {blockType === "discretization" && (
            <div>
              <Label>Output Variable Names</Label>
              {outputVarNames.map((name, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input value={name} onChange={e => handleOutputVarChange(idx, e.target.value)} placeholder={`output_variable_${idx + 1}`} />
                  <Button type="button" variant="destructive" onClick={() => removeOutputVar(idx)} disabled={outputVarNames.length === 1}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOutputVar}>+ Add Output Variable</Button>
            </div>
          )}

          {blockType === "multi_list" && (
            <div>
              <Label>Lists</Label>
              {multiLists.map((list, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input value={list.list_name} onChange={e => handleMultiListChange(idx, "list_name", e.target.value)} placeholder="List Name" />
                  <Input type="number" value={list.priority} onChange={e => handleMultiListChange(idx, "priority", Number(e.target.value))} placeholder="Priority" style={{width: 100}} />
                  <Button type="button" variant="destructive" onClick={() => removeMultiList(idx)} disabled={multiLists.length === 1}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addMultiList}>+ Add List</Button>
            </div>
          )}

          {/* Prompt */}
          <div>
            <Label>Prompt</Label>
            <EnhancedAutocompleteTextarea
              value={prompt}
              onChange={setPrompt}
              placeholder="Enter prompt (type << to see variable suggestions)"
              options={variables}
              rows={4}
            />
          </div>
          {/* Output Name */}
          <div>
            <Label>Output Name</Label>
            <Input value={outputName} onChange={e => setOutputName(e.target.value)} required placeholder="e.g. processed_claims" />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Block"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
