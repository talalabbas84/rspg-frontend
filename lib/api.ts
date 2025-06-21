import type {
  User,
  Sequence,
  Block,
  Variable,
  GlobalList,
  Run,
  CreateBlockData,
  UpdateBlockData,
  AvailableVariable,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const config: RequestInit = { ...options, headers }

    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `API Error: ${response.status}`)
      }
      if (response.status === 204) return null as T
      return response.json()
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error)
      throw error
    }
  }

  // --- Auth ---
  async login(data: any) {
    const formData = new URLSearchParams()
    formData.append("username", data.email)
    formData.append("password", data.password)
    return this.request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
  }
  async register(data: any) {
    return this.request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) })
  }
  async getMe() {
    return this.request<User>("/auth/me")
  }

  // --- Sequences ---
  async getSequences() {
    return this.request<Sequence[]>("/sequences/")
  }
  async getSequence(id: string) {
    return this.request<Sequence>(`/sequences/${id}`)
  }
  async createSequence(data: any) {
    return this.request<Sequence>("/sequences/", { method: "POST", body: JSON.stringify(data) })
  }
  async updateSequence(id: string, data: any) {
    return this.request<Sequence>(`/sequences/${id}`, { method: "PUT", body: JSON.stringify(data) })
  }
  async deleteSequence(id: string) {
    return this.request<null>(`/sequences/${id}`, { method: "DELETE" })
  }

  // --- Blocks ---
  async getBlocksBySequence(sequenceId: string) {
    return this.request<Block[]>(`/blocks/by_sequence/${sequenceId}`)
  }
  async createBlock(data: CreateBlockData) {
    return this.request<Block>("/blocks/", { method: "POST", body: JSON.stringify(data) })
  }
  async updateBlock(id: string, data: UpdateBlockData) {
    return this.request<Block>(`/blocks/${id}`, { method: "PUT", body: JSON.stringify(data) })
  }
  async deleteBlock(id: string) {
    return this.request<null>(`/blocks/${id}`, { method: "DELETE" })
  }

  // --- Variables ---
  async getVariablesBySequence(sequenceId: string) {
    return this.request<Variable[]>(`/variables/by_sequence/${sequenceId}`)
  }
  async createVariable(data: any) {
    return this.request<Variable>("/variables/", { method: "POST", body: JSON.stringify(data) })
  }
  async deleteVariable(id: string) {
    return this.request<null>(`/variables/${id}`, { method: "DELETE" })
  }
  async getAvailableVariablesForSequence(sequenceId: string) {
    return this.request<AvailableVariable[]>(`/variables/available_for_sequence/${sequenceId}`)
  }

  // --- Global Lists ---
  async getGlobalLists() {
    return this.request<GlobalList[]>("/global-lists/")
  }
  async createGlobalList(data: any) {
    return this.request<GlobalList>("/global-lists/", { method: "POST", body: JSON.stringify(data) })
  }
  async updateGlobalList(id: string, data: any) {
    return this.request<GlobalList>(`/global-lists/${id}`, { method: "PUT", body: JSON.stringify(data) })
  }
  async deleteGlobalList(id: string) {
    return this.request<null>(`/global-lists/${id}`, { method: "DELETE" })
  }

  // --- Runs ---
  async createRunForSequence(data: any) {
    return this.request<Run>("/runs/", { method: "POST", body: JSON.stringify(data) })
  }
  async getRunsBySequence(sequenceId: string) {
    return this.request<Run[]>(`/runs/by_sequence/${sequenceId}`)
  }
  async getRunDetails(runId: string) {
    return this.request<any>(`/runs/${runId}`) // Define a detailed Run type if needed
  }
  async previewPrompt(sequenceId: string, blockId: string, inputOverrides?: any) {
    return this.request<{ rendered_prompt: string }>("/engine/preview_prompt", {
      method: "POST",
      body: JSON.stringify({ sequence_id: sequenceId, block_id: blockId, input_overrides: inputOverrides || {} }),
    })
  }
}

export const apiClient = new ApiClient()
