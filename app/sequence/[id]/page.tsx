"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import type { Sequence, Block, CreateBlockData } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DragDropBlockResponsePairs } from "@/components/blocks/drag-drop-block-response-pairs";
import { EnhancedCreateBlockModal } from "@/components/modals/enhanced-create-block-modal";
import { BlockTypeSelectionModal } from "@/components/modals/block-type-selection-modal";
import { EditBlockModal } from "@/components/modals/enhanced-edit-block-modal";
import { GlobalVariablesManager } from "@/components/variables/global-variables-manager";
import { SequenceRunner } from "@/components/sequence/sequence-runner";
import { SequenceExportImport } from "@/components/sequence/sequence-export-import";
import { ExecutionHistory } from "@/components/sequence/execution-history";
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
} from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useRunActions } from "@/hooks/use-run-actions";

export default function SequencePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const sequenceId = params.id as string;

  // Main states from API
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadingSequence, setLoadingSequence] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Modal and tab states
  const [showBlockTypeSelection, setShowBlockTypeSelection] = useState(false);
  const [showCreateBlock, setShowCreateBlock] = useState(false);
  const [showEditBlock, setShowEditBlock] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<any>("standard");
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [activeTab, setActiveTab] = useState("blocks");
  const { getRunsForSequence } = useRunActions();

  // Ensure sequenceId is valid
  if (!sequenceId || typeof sequenceId !== "string") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-red-600">Invalid sequence ID.</p>
      </div>
    );
  }

  // API: Fetch sequence and blocks
  const fetchSequenceData = useCallback(async () => {
    if (!sequenceId || !isAuthenticated) return;
    setLoadingSequence(true);
    try {
      const [seqData, blocksData] = await Promise.all([
        apiClient.getSequence(sequenceId),
        apiClient.getBlocksBySequence(sequenceId),
      ]);
      setSequence(seqData);
      setBlocks((blocksData || []).sort((a, b) => a.order - b.order));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load sequence: ${error.message}`,
      });
      router.push("/");
    } finally {
      setLoadingSequence(false);
    }
  }, [sequenceId, isAuthenticated, toast, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    } else if (isAuthenticated && sequenceId) {
      fetchSequenceData();
    }
    // eslint-disable-next-line
  }, [authLoading, isAuthenticated, sequenceId, fetchSequenceData]);

  // API: Save sequence name/description
  const handleSequenceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!sequence) return;
    setSequence({ ...sequence, name: e.target.value });
  };
  const handleSequenceDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    if (!sequence) return;
    setSequence({ ...sequence, description: e.target.value });
  };
  const handleAutoSave = async () => {
    if (!sequence) return;
    try {
      await apiClient.updateSequence(sequence.id, {
        name: sequence.name,
        description: sequence.description,
      });
      setLastSaved(new Date());
      toast({ title: "Auto-saved!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // API: Block CRUD
  const handleBlockTypeSelect = (type: any) => {
    setSelectedBlockType(type);
    setShowBlockTypeSelection(false);
    setShowCreateBlock(true);
  };
  const handleCreateBlock = async (data: CreateBlockData) => {
    try {
      await apiClient.createBlock({ ...data, sequence_id: sequenceId });
      setShowCreateBlock(false);
      fetchSequenceData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };
  const handleEditBlock = (block: Block) => {
    setEditingBlock(block);
    setShowEditBlock(true);
  };
  const handleUpdateBlock = async (updatedBlock: Block) => {
    try {
      await apiClient.updateBlock(updatedBlock.id, updatedBlock);
      setShowEditBlock(false);
      setEditingBlock(null);
      fetchSequenceData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };
  const handleDeleteBlock = async (blockId: string) => {
    try {
      await apiClient.deleteBlock(blockId);
      fetchSequenceData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // Sequence Export/Import logic
  const handleImportSequence = (data: any) => {
    if (data.sequence) {
      setSequence({
        ...sequence!,
        name: data.sequence.name,
        description: data.sequence.description,
      });
    }
    setBlocks(data.blocks || []);
    handleAutoSave();
  };

  // Analytics
  const getSequenceStats = () => {
    const completedBlocks = blocks.filter(
      (b) => b.status === "completed"
    ).length;
    const totalBlocks = blocks.length;
    const progress =
      totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

    return {
      totalBlocks,
      completedBlocks,
      progress,
      lastRun: blocks.find((b) => b.last_run)
        ? new Date(blocks.find((b) => b.last_run)!.last_run!)
        : null,
    };
  };

  const stats = getSequenceStats();

  // Tabs
  const tabConfig = [
    { id: "blocks", label: "Blocks", icon: Play, shortLabel: "Blocks" },
    { id: "variables", label: "Variables", icon: Variable, shortLabel: "Vars" },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      shortLabel: "Stats",
    },
    { id: "history", label: "History", icon: History, shortLabel: "History" },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      shortLabel: "Settings",
    },
  ];

  // Loading State
  if (loadingSequence) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg
          className="animate-spin h-8 w-8 mr-3 text-gray-500"
          viewBox="0 0 24 24"
        />
        <span className="text-lg">Loading sequence...</span>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-red-600 mb-4">
          Sequence not found or you don't have access.
        </p>
        <Button onClick={() => router.push("/")} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <AppLayout>
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
                        setShowBlockTypeSelection(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Block
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowExportImport(true);
                        setShowMobileMenu(false);
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
                  value={sequence?.name || ""}
                  onChange={handleSequenceNameChange}
                  className="text-lg sm:text-xl font-bold text-gray-900 border-none shadow-none p-0 h-auto truncate"
                  onBlur={handleAutoSave}
                />
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="hidden sm:inline">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
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
              <Button
                onClick={() => setShowBlockTypeSelection(true)}
                className="flex items-center gap-2"
              >
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
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
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

              <TabsContent
                value="blocks"
                className="space-y-4 sm:space-y-6 mt-4"
              >
                <SequenceRunner
                  sequenceId={sequenceId}
                  blocks={blocks}
                  onRunComplete={(results) => {
                    console.log("Sequence completed:", results);
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

              <TabsContent
                value="analytics"
                className="space-y-4 sm:space-y-6 mt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-lg border">
                    <h3 className="text-base sm:text-lg font-medium mb-4">
                      Execution Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Blocks:</span>
                        <span className="font-medium">{stats.totalBlocks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completed:</span>
                        <span className="font-medium text-green-600">
                          {stats.completedBlocks}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Progress:</span>
                        <span className="font-medium">{stats.progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg border">
                    <h3 className="text-base sm:text-lg font-medium mb-4">
                      Block Types
                    </h3>
                    <div className="space-y-2">
                      {[
                        "standard",
                        "discretization",
                        "single_list",
                        "multi_list",
                      ].map((type) => {
                        const count = blocks.filter(
                          (b) => b.block_type === type
                        ).length;
                        return (
                          <div
                            key={type}
                            className="flex justify-between text-sm"
                          >
                            <span className="capitalize">
                              {type.replace("_", " ")}:
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg border sm:col-span-2 lg:col-span-1">
                    <h3 className="text-base sm:text-lg font-medium mb-4">
                      Recent Activity
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        Last run:{" "}
                        {stats.lastRun
                          ? stats.lastRun.toLocaleString()
                          : "Never"}
                      </div>
                      <div>Last saved: {lastSaved.toLocaleString()}</div>
                      <div>Auto-save: Enabled</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="history"
                className="space-y-4 sm:space-y-6 mt-4"
              >
                <ExecutionHistory
                  sequenceId={sequenceId}
                  onRerunFromHistory={(runId) => {
                    console.log("Rerunning from history:", runId);
                  }}
                  onViewRunDetails={(run) => {
                    console.log("Viewing run details:", run);
                  }}
                />
              </TabsContent>

              <TabsContent
                value="settings"
                className="space-y-4 sm:space-y-6 mt-4"
              >
                <div className="bg-white p-4 sm:p-6 rounded-lg border">
                  <h3 className="text-base sm:text-lg font-medium mb-4">
                    Sequence Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Sequence Name
                      </label>
                      <Input
                        value={sequence?.name || ""}
                        onChange={handleSequenceNameChange}
                        className="w-full"
                        onBlur={handleAutoSave}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Description
                      </label>
                      <textarea
                        value={sequence?.description || ""}
                        onChange={handleSequenceDescriptionChange}
                        className="w-full p-3 border rounded-md"
                        rows={3}
                        placeholder="Describe what this sequence does..."
                        onBlur={handleAutoSave}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowExportImport(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export Sequence
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowExportImport(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import Sequence
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleAutoSave}
                        className="flex-1 sm:flex-none"
                      >
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
          onSelectBlockType={handleBlockTypeSelect}
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
            name: sequence?.name || "",
            description: sequence?.description || "",
            created_at: sequence?.created_at || new Date().toISOString(),
            updated_at: sequence?.updated_at || new Date().toISOString(),
          }}
          blocks={blocks}
          variables={[]}
          globalLists={[]}
          onImport={handleImportSequence}
        />
      </div>
    </AppLayout>
  );
}
