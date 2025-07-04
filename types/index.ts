// This file should be kept in sync with your backend Pydantic models.

export interface User {
  id: string
  name: string
  email: string
  is_active: boolean
}

export interface Sequence {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  chunk_size?: number
  preserve_sentences?: boolean
  loop_enabled?: boolean
}

export type BlockType = "standard" | "discretization" | "single_list" | "multi_list"

// --- Block Configs ---
export interface BlockConfigStandard {
  output_variable_name: string
}

export interface BlockConfigDiscretization {
  output_names: string[]
}

export interface BlockConfigSingleList {
  input_list_variable_name: string
  output_list_variable_name: string
  store_in_global_list?: boolean
  global_list_name?: string
}

export interface MultiListConfigItem {
  id: string // Frontend temporary ID for list management
  name: string // Name of the list variable
  priority: number
}

export interface BlockConfigMultiList {
  input_lists_config: MultiListConfigItem[]
  output_matrix_variable_name: string
  store_in_global_list?: boolean
  global_list_name?: string
}

export type BlockConfig = BlockConfigStandard | BlockConfigDiscretization | BlockConfigSingleList | BlockConfigMultiList

// --- Block ---
export interface Block {
  id: string
  sequence_id: string
  name: string
  block_type: BlockType
  order: number
  model: string
  prompt: string
  config: BlockConfig
  created_at: string
  updated_at: string
  last_run?: string
  status?: "idle" | "running" | "completed" | "failed"
}

// --- Variables ---
export interface Variable {
  id: number
  sequence_id?: string | null // Can be null for user-level globals
  name: string
  value: string
  value_json?: { [key: string]: any } // For complex types
  type: "global" | "list" | "output" | "input"
  description?: string
  created_at?: string
  updated_at?: string
}

// For autocomplete suggestions
export interface AvailableVariable {
  value: string // The string to insert, e.g., "{{myVar}}"
  label: string // Display label, e.g., "myVar (Global)"
  type: "global" | "list" | "output" | "input" | "matrix_output" | "list_output" | "discretized_output"
  description?: string
  isList?: boolean
  isMatrix?: boolean
}

// --- Global Lists ---
export interface GlobalListItem {
  id: number
  value: string
  order?: number
  global_list_id?: number
  created_at?: string
  updated_at?: string
}

export interface GlobalList {
  id: number              // Should be number (matches backend)
  name: string
  items: GlobalListItem[]
  description?: string | null
  created_at: string
  updated_at: string
}

// --- API Payloads ---
export interface CreateBlockData {
  name: string
  sequence_id: string
  type: BlockType
  model: string
  prompt: string
  order_index: number
  config: Partial<BlockConfig>

}

export interface UpdateBlockData {
  name?: string
  order?: number
  model?: string
  prompt?: string
  config_json?: Partial<BlockConfig>
}

// --- Runs & Execution ---
export interface Run {
  id: string
  sequence_id: string
  status: "pending" | "running" | "completed" | "failed"
  created_at: string
  updated_at: string
  current_block_index?: number
  error_message?: string
}

export interface BlockResponse {
  id: string
  blockId: string
  content: string
  outputs?: { [key: string]: string }
  matrix_output?: { [key: string]: { [key: string]: string } }
  editedAt?: string
  prompt_text?: string; // <-- add this line!

}


export interface BlockRun {
  id: string | number
  run_id: string | number
  block_id?: string | number
  block_name_snapshot?: string
  block_type_snapshot?: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  started_at?: string
  completed_at?: string
  prompt_text?: string
  llm_output_text?: string
  named_outputs_json?: Record<string, any> | null
  list_outputs_json?: Record<string, any> | null
  matrix_outputs_json?: Record<string, any> | null
  error_message?: string | null
  // ...add anything else your backend provides
}