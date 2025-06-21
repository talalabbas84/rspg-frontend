"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DragDropBlockResponsePairs } from "@/components/blocks/drag-drop-block-response-pairs"
import { EnhancedCreateBlockModal } from "@/components/modals/enhanced-create-block-modal"
import { BlockTypeSelectionModal } from "@/components/modals/block-type-selection-modal"
import { EditBlockModal } from "@/components/modals/edit-block-modal"
import { GlobalVariablesManager } from "@/components/variables/global-variables-manager"
import { SequenceRunner } from "@/components/sequence/sequence-runner"
import { SequenceExportImport } from "@/components/sequence/sequence-export-import"
import { ExecutionHistory } from "@/components/sequence/execution-history"
import type { Block, BlockType, CreateBlockData, ExportData } from "@/types"
import {
  Play,
  Settings,
  Variable,
  Download,
  Upload,
  Save,
  History,
  BarChart3,
  FileText,
  Zap,
  Menu,
  Plus,
  Smartphone,
} from "lucide-react"

export default function SequencePage() {
  const params = useParams()
  const sequenceId = params.id as string
  const [sequenceName, setSequenceName] = useState("Patent Claims Analysis Sequence")
  const [sequenceDescription, setSequenceDescription] = useState(
    "Advanced patent claim analysis and categorization workflow",
  )
  const [showBlockTypeSelection, setShowBlockTypeSelection] = useState(false)
  const [showCreateBlock, setShowCreateBlock] = useState(false)
  const [showEditBlock, setShowEditBlock] = useState(false)
  const [showExportImport, setShowExportImport] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>("standard")
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [lastSaved, setLastSaved] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("blocks")

  // Enhanced mock data with all block types
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: "1",
      sequence_id: sequenceId,
      name: "Extract Claims",
      block_type: "standard",
      order: 1,
      model: "claude-3-5-sonnet-latest",
      prompt: "Extract all patent claims from the following text: <<global_context>>",
      output_name: "extracted_claims",
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "completed",
    },
    {
      id: "2",
      sequence_id: sequenceId,
      name: "Categorize Claims",
      block_type: "discretization",
      order: 2,
      model: "claude-3-5-sonnet-latest",
      prompt: "Categorize the claims into independent and dependent: <<extracted_claims>>",
      output_name: "categorized_claims",
      config: {
        number_of_outputs: 4,
        output_variable_names: ["independent_claims", "dependent_claims", "method_claims", "system_claims"],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "completed",
    },
    {
      id: "3",
      sequence_id: sequenceId,
      name: "Process Each Claim",
      block_type: "single_list",
      order: 3,
      model: "claude-3-5-sonnet-latest",
      prompt: "Analyze this claim for novelty and non-obviousness: <<claim_item>>",
      output_name: "claim_analysis",
      config: {
        input_list_name: "independent_claims",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "idle",
    },
    {
      id: "4",
      sequence_id: sequenceId,
      name: "Cross-Reference Analysis",
      block_type: "multi_list",
      order: 4,
      model: "claude-3-5-sonnet-latest",
      prompt: "Compare claim <<primary_claim>> against prior art <<prior_art_item>> for relevance",
      output_name: "relevance_matrix",
      config: {
        lists: [
          { id: "1", list_name: "independent_claims", priority: 1 },
          { id: "2", list_name: "prior_art_references", priority: 2 },
        ],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "idle",
    },
  ])

  const handleBlockTypeSelect = (type: BlockType) => {
    setSelectedBlockType(type)
    setShowBlockTypeSelection(false)
    setShowCreateBlock(true)
  }

  const handleCreateBlock = (data: CreateBlockData) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      sequence_id: sequenceId,
      order: blocks.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "idle",
      ...data,
    }
    setBlocks([...blocks, newBlock])
    handleAutoSave()
  }

  const handleEditBlock = (block: Block) => {
    setEditingBlock(block)
    setShowEditBlock(true)
  }

  const handleUpdateBlock = (updatedBlock: Block) => {
    setBlocks(blocks.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)))
    setShowEditBlock(false)
    setEditingBlock(null)
    handleAutoSave()
  }

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((block) => block.id !== blockId))
    handleAutoSave()
  }

  const handleAutoSave = () => {
    setLastSaved(new Date())
    // In real app, this would save to backend
    console.log("Auto-saved sequence")
  }

  const handleImportSequence = (data: ExportData) => {
    setSequenceName(data.sequence.name)
    setSequenceDescription(data.sequence.description || "")
    setBlocks(data.blocks)
    handleAutoSave()
  }

  const getSequenceStats = () => {
    const completedBlocks = blocks.filter((b) => b.status === "completed").length
    const totalBlocks = blocks.length
    const progress = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0

    return {
      totalBlocks,
      completedBlocks,
      progress,
      lastRun: blocks.find((b) => b.last_run) ? new Date(blocks.find((b) => b.last_run)!.last_run!) : null,
    }
  }

  const stats = getSequenceStats()

  // Mobile-optimized tab configuration
  const tabConfig = [
    { id: "blocks", label: "Blocks", icon: Play, shortLabel: "Blocks" },
    { id: "variables", label: "Variables", icon: Variable, shortLabel: "Vars" },
    { id: "analytics", label: "Analytics", icon: BarChart3, shortLabel: "Stats" },
    { id: "history", label: "History", icon: History, shortLabel: "History" },
    { id: "settings", label: "Settings", icon: Settings, shortLabel: "Settings" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-Optimized Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Sequence Menu</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <Button
                    onClick={() => {
                      setShowBlockTypeSelection(true)
                      setShowMobileMenu(false)
                    }}
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Block
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowExportImport(true)
                      setShowMobileMenu(false)
                    }}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export/Import
                  </Button>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 space-y-2">
                      <div>Progress: {stats.progress}%</div>
                      <div>
                        Blocks: {stats.completedBlocks}/{stats.totalBlocks}
                      </div>
                      <div>Last saved: {lastSaved.toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="space-y-1 flex-1 min-w-0">
              <Input
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                className="text-lg sm:text-xl font-bold text-gray-900 border-none shadow-none p-0 h-auto truncate"
                onBlur={handleAutoSave}
              />
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <span className="hidden sm:inline">Last saved: {lastSaved.toLocaleTimeString()}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.progress}% complete
                </Badge>
                <Badge variant="outline" className="text-xs md:hidden">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Mobile
                </Badge>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportImport(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export/Import
            </Button>
            <Button onClick={() => setShowBlockTypeSelection(true)} className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Create New Block
            </Button>
          </div>

          {/* Mobile Create Button */}
          <Button
            onClick={() => setShowBlockTypeSelection(true)}
            size="sm"
            className="md:hidden flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Create</span>
          </Button>
        </div>
      </header>

      {/* Mobile-Optimized Main Content */}
      <main className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile-Optimized Tab List */}
            <TabsList className="grid w-full grid-cols-5 h-auto p-1">
              {tabConfig.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-1 py-2 px-1 text-xs data-[state=active]:bg-white"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="blocks" className="space-y-4 sm:space-y-6 mt-4">
              <SequenceRunner
                sequenceId={sequenceId}
                blocks={blocks}
                onRunComplete={(results) => {
                  console.log("Sequence completed:", results)
                }}
              />
              <DragDropBlockResponsePairs
                sequenceId={sequenceId}
                onEditBlock={handleEditBlock}
                onDeleteBlock={handleDeleteBlock}
              />
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <GlobalVariablesManager sequenceId={sequenceId} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 sm:space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-lg border">
                  <h3 className="text-base sm:text-lg font-medium mb-4">Execution Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Blocks:</span>
                      <span className="font-medium">{stats.totalBlocks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completed:</span>
                      <span className="font-medium text-green-600">{stats.completedBlocks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Progress:</span>
                      <span className="font-medium">{stats.progress}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg border">
                  <h3 className="text-base sm:text-lg font-medium mb-4">Block Types</h3>
                  <div className="space-y-2">
                    {["standard", "discretization", "single_list", "multi_list"].map((type) => {
                      const count = blocks.filter((b) => b.block_type === type).length
                      return (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="capitalize">{type.replace("_", " ")}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg border sm:col-span-2 lg:col-span-1">
                  <h3 className="text-base sm:text-lg font-medium mb-4">Recent Activity</h3>
                  <div className="space-y-2 text-sm">
                    <div>Last run: {stats.lastRun ? stats.lastRun.toLocaleString() : "Never"}</div>
                    <div>Last saved: {lastSaved.toLocaleString()}</div>
                    <div>Auto-save: Enabled</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 sm:space-y-6 mt-4">
              <ExecutionHistory
                sequenceId={sequenceId}
                onRerunFromHistory={(runId) => {
                  console.log("Rerunning from history:", runId)
                }}
                onViewRunDetails={(run) => {
                  console.log("Viewing run details:", run)
                }}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 sm:space-y-6 mt-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg border">
                <h3 className="text-base sm:text-lg font-medium mb-4">Sequence Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sequence Name</label>
                    <Input
                      value={sequenceName}
                      onChange={(e) => setSequenceName(e.target.value)}
                      className="w-full"
                      onBlur={handleAutoSave}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={sequenceDescription}
                      onChange={(e) => setSequenceDescription(e.target.value)}
                      className="w-full p-3 border rounded-md"
                      rows={3}
                      placeholder="Describe what this sequence does..."
                      onBlur={handleAutoSave}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowExportImport(true)} className="flex-1 sm:flex-none">
                      <FileText className="h-4 w-4 mr-2" />
                      Export Sequence
                    </Button>
                    <Button variant="outline" onClick={() => setShowExportImport(true)} className="flex-1 sm:flex-none">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Sequence
                    </Button>
                    <Button variant="outline" onClick={handleAutoSave} className="flex-1 sm:flex-none">
                      <Save className="h-4 w-4 mr-2" />
                      Save Now
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modals */}
      <BlockTypeSelectionModal
        open={showBlockTypeSelection}
        onOpenChange={setShowBlockTypeSelection}
        onSelectType={handleBlockTypeSelect}
      />
      <EnhancedCreateBlockModal
        open={showCreateBlock}
        onOpenChange={setShowCreateBlock}
        blockType={selectedBlockType}
        sequenceId={sequenceId}
        onCreate={handleCreateBlock}
      />
      <EditBlockModal
        open={showEditBlock}
        onOpenChange={setShowEditBlock}
        block={editingBlock}
        onUpdate={handleUpdateBlock}
      />
      <SequenceExportImport
        open={showExportImport}
        onOpenChange={setShowExportImport}
        sequence={{
          id: sequenceId,
          name: sequenceName,
          description: sequenceDescription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        blocks={blocks}
        variables={[]}
        globalLists={[]}
        onImport={handleImportSequence}
      />
    </div>
  )
}
