const API_BASE_URL = 'http://localhost:8000/api';

export interface LLMModel {
  provider: string;
  model: string;
}

export interface Tool {
  id?: string;
  name: string;
  description: string;
  prompt_piece: string;
}

export interface Agent {
  id?: string;
  name: string;
  llm_model: LLMModel;
  system_prompt: string;
  tool_ids: string[];
}

export interface ChatResponse {
  response: string;
  tools_used: string[];
  tools_used_names: string[];
  full_prompt: string;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return response.json();
};

export const api = {
  async getModels() {
    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Return default models structure if API fails
      return {
        openai: [
          { model: "gpt-4", name: "GPT-4" },
          { model: "gpt-4-turbo-preview", name: "GPT-4 Turbo" },
          { model: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
        ],
        anthropic: [
          { model: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { model: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
          { model: "claude-3-haiku-20240229", name: "Claude 3 Haiku" },
        ]
      };
    }
  },

  async getTools(): Promise<Tool[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tools`);
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      return [];
    }
  },

  async createTool(tool: Omit<Tool, 'id'>): Promise<Tool> {
    const response = await fetch(`${API_BASE_URL}/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool),
    });
    return handleResponse(response);
  },

  async updateTool(toolId: string, tool: Omit<Tool, 'id'>): Promise<Tool> {
    const response = await fetch(`${API_BASE_URL}/tools/${toolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool),
    });
    return handleResponse(response);
  },

  async deleteTool(toolId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tools/${toolId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete tool: ${response.statusText}`);
    }
  },

  async getAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents`);
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return [];
    }
  },

  async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`);
    return handleResponse(response);
  },

  async createAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return handleResponse(response);
  },

  async updateAgent(agentId: string, agent: Omit<Agent, 'id'>): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return handleResponse(response);
  },

  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  },

  async chatWithAgent(agentId: string, userMessage: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, user_message: userMessage }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      const error = new Error(errorData.detail || 'Failed to chat with agent');
      (error as any).response = response;
      throw error;
    }
    return response.json();
  },
};

