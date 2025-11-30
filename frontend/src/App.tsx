import { useState, useEffect } from 'react'
import { api } from './api'
import type { Tool, Agent, ChatResponse } from './api'
import './App.css'

type Tab = 'tools' | 'agents' | 'chat'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tools')
  const [tools, setTools] = useState<Tool[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [models, setModels] = useState<{ openai: any[], anthropic: any[] }>({ openai: [], anthropic: [] })
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, toolsUsed?: string[], toolsUsedNames?: string[] }>>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [toolsData, agentsData, modelsData] = await Promise.all([
        api.getTools(),
        api.getAgents(),
        api.getModels()
      ])
      setTools(toolsData)
      setAgents(agentsData)
      setModels(modelsData)
      setBackendConnected(true)
    } catch (error) {
      console.error('Failed to load data:', error)
      setBackendConnected(false)
      // Continue with empty data so UI still renders
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedAgent || !currentMessage.trim() || isThinking) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsThinking(true)

    try {
      const response: ChatResponse = await api.chatWithAgent(selectedAgent, userMessage)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.response,
        toolsUsed: response.tools_used,
        toolsUsedNames: response.tools_used_names
      }])
    } catch (error: any) {
      console.error('Failed to send message:', error)
      let errorMessage = 'Failed to get response from agent.'
      
      // The error message from api.ts should already contain the detail
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response) {
        try {
          const errorData = await error.response.json()
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = error.response.statusText || errorMessage
        }
      }
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMessage}`
      }])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Agent Skills Tester</h1>
        <p>Create agents, manage tools, and chat with AI models</p>
      </header>

      {backendConnected === false && (
        <div className="connection-banner">
          ⚠️ Backend not connected. Make sure the backend is running on http://localhost:8000
        </div>
      )}
      
      <nav className="tabs">
        <button 
          className={activeTab === 'tools' ? 'active' : ''} 
          onClick={() => setActiveTab('tools')}
        >
          🛠️ Skills
        </button>
        <button 
          className={activeTab === 'agents' ? 'active' : ''} 
          onClick={() => setActiveTab('agents')}
        >
          👤 Agents
        </button>
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
      </nav>

      <main className="main-content">
        {loading && <div className="loading">Loading...</div>}
        
        {!loading && (
          <>
            {activeTab === 'tools' && (
              <ToolsTab tools={tools} onRefresh={loadData} />
            )}
            
            {activeTab === 'agents' && (
              <AgentsTab 
                agents={agents} 
                tools={tools}
                models={models}
                onRefresh={loadData} 
              />
            )}
            
            {activeTab === 'chat' && (
              <ChatTab
                agents={agents}
                selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            messages={chatMessages}
            currentMessage={currentMessage}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
          />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// Tools Tab Component
function ToolsTab({ tools, onRefresh }: { tools: Tool[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_piece: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const toolData = {
        name: formData.name,
        description: formData.description,
        prompt_piece: formData.prompt_piece
      }

      if (editingTool?.id) {
        await api.updateTool(editingTool.id, toolData)
      } else {
        await api.createTool(toolData)
      }

      resetForm()
      onRefresh()
    } catch (error) {
      console.error('Failed to save tool:', error)
      alert('Failed to save tool')
    }
  }

  const handleDelete = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return
    try {
      await api.deleteTool(toolId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete tool:', error)
      alert('Failed to delete tool')
    }
  }

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool)
    setFormData({
      name: tool.name,
      description: tool.description,
      prompt_piece: tool.prompt_piece
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', prompt_piece: '' })
    setEditingTool(null)
    setShowForm(false)
  }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Skills</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
          + Create Skill
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingTool ? 'Edit Skill' : 'Create New Skill'}</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Skill</label>
            <textarea
              value={formData.prompt_piece}
              onChange={(e) => setFormData({ ...formData, prompt_piece: e.target.value })}
              rows={6}
              required
              placeholder="Enter the skill content that will be provided when the LLM requests this tool..."
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingTool ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="cards-grid">
        {tools.map(tool => (
          <div key={tool.id} className="card">
            <div className="card-header">
              <h3>{tool.name}</h3>
              <div className="card-actions">
                <button onClick={() => handleEdit(tool)} className="btn-icon">✏️</button>
                <button onClick={() => handleDelete(tool.id!)} className="btn-icon">🗑️</button>
              </div>
            </div>
            <p className="card-description">{tool.description}</p>
            <details className="card-details">
              <summary>View Skill</summary>
              <pre className="prompt-preview">{tool.prompt_piece}</pre>
            </details>
          </div>
        ))}
        {tools.length === 0 && (
          <div className="empty-state">
            <p>No skills yet. Create your first skill to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Agents Tab Component
function AgentsTab({ 
  agents, 
  tools, 
  models, 
  onRefresh 
}: { 
  agents: Agent[], 
  tools: Tool[], 
  models: { openai: any[], anthropic: any[] },
  onRefresh: () => void 
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    model: '',
    system_prompt: '',
    tool_ids: [] as string[]
  })

  useEffect(() => {
    if (formData.provider && models[formData.provider as keyof typeof models]) {
      const providerModels = models[formData.provider as keyof typeof models]
      if (providerModels.length > 0 && !providerModels.find(m => m.model === formData.model)) {
        setFormData({ ...formData, model: providerModels[0].model })
      }
    }
  }, [formData.provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate model is selected
    if (!formData.model || formData.model.trim() === '') {
      alert('Please select a model for this agent.')
      return
    }
    
    try {
      const agentData = {
        name: formData.name,
        llm_model: {
          provider: formData.provider,
          model: formData.model
        },
        system_prompt: formData.system_prompt,
        tool_ids: formData.tool_ids
      }

      if (editingAgent?.id) {
        await api.updateAgent(editingAgent.id, agentData)
      } else {
        await api.createAgent(agentData)
      }

      resetForm()
      onRefresh()
    } catch (error) {
      console.error('Failed to save agent:', error)
      alert('Failed to save agent')
    }
  }

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    try {
      await api.deleteAgent(agentId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete agent:', error)
      alert('Failed to delete agent')
    }
  }

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      provider: agent.llm_model.provider,
      model: agent.llm_model.model,
      system_prompt: agent.system_prompt,
      tool_ids: agent.tool_ids
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      model: '',
      system_prompt: '',
      tool_ids: []
    })
    setEditingAgent(null)
    setShowForm(false)
  }

  const toggleTool = (toolId: string) => {
    setFormData({
      ...formData,
      tool_ids: formData.tool_ids.includes(toolId)
        ? formData.tool_ids.filter(id => id !== toolId)
        : [...formData.tool_ids, toolId]
    })
  }

  const availableModels = models[formData.provider as keyof typeof models] || []

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Agents</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
          + Create Agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>LLM Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value, model: '' })}
                required
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model *</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              >
                <option value="">-- Select a model --</option>
                {availableModels.map(m => (
                  <option key={m.model} value={m.model}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={6}
              required
              placeholder="Enter the system prompt for this agent..."
            />
          </div>
          <div className="form-group">
            <label>Available Skills</label>
            <div className="tools-checklist">
              {tools.map(tool => (
                <label key={tool.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.tool_ids.includes(tool.id!)}
                    onChange={() => toggleTool(tool.id!)}
                  />
                  <span>{tool.name}</span>
                  <small>{tool.description}</small>
                </label>
              ))}
              {tools.length === 0 && (
                <p className="text-muted">No skills available. Create skills first.</p>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingAgent ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="cards-grid">
        {agents.map(agent => {
          const agentTools = tools.filter(t => agent.tool_ids.includes(t.id!))
          return (
            <div key={agent.id} className="card">
              <div className="card-header">
                <h3>{agent.name}</h3>
                <div className="card-actions">
                  <button onClick={() => handleEdit(agent)} className="btn-icon">✏️</button>
                  <button onClick={() => handleDelete(agent.id!)} className="btn-icon">🗑️</button>
                </div>
              </div>
              <div className="card-info">
                <p><strong>Model:</strong> {agent.llm_model.provider} / {agent.llm_model.model}</p>
                <p><strong>Skills:</strong> {agentTools.length} skill(s)</p>
              </div>
              <details className="card-details">
                <summary>View System Prompt</summary>
                <pre className="prompt-preview">{agent.system_prompt}</pre>
              </details>
              {agentTools.length > 0 && (
                <div className="card-tags">
                  {agentTools.map(tool => (
                    <span key={tool.id} className="tag">{tool.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {agents.length === 0 && (
          <div className="empty-state">
            <p>No agents yet. Create your first agent to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Chat Tab Component
function ChatTab({
  agents,
  selectedAgent,
  onSelectAgent,
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  isThinking
}: {
  agents: Agent[]
  selectedAgent: string
  onSelectAgent: (id: string) => void
  messages: Array<{ role: 'user' | 'assistant', content: string, toolsUsed?: string[], toolsUsedNames?: string[] }>
  currentMessage: string
  onMessageChange: (msg: string) => void
  onSendMessage: () => void
  isThinking: boolean
}) {
  const selectedAgentData = agents.find(a => a.id === selectedAgent)

  return (
    <div className="tab-content chat-container">
      <div className="chat-sidebar">
        <h3>Select Agent</h3>
        {agents.length === 0 ? (
          <p className="text-muted">No agents available. Create an agent first.</p>
        ) : (
          <div className="agent-list">
            {agents.map(agent => (
              <button
                key={agent.id}
                className={`agent-item ${selectedAgent === agent.id ? 'active' : ''}`}
                onClick={() => onSelectAgent(agent.id!)}
              >
                <div className="agent-item-name">{agent.name}</div>
                <div className="agent-item-model">{agent.llm_model.provider} / {agent.llm_model.model}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chat-main">
        {!selectedAgent ? (
          <div className="chat-placeholder">
            <p>Select an agent from the sidebar to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <h3>{selectedAgentData?.name}</h3>
              <p className="chat-model-info">{selectedAgentData?.llm_model.provider} / {selectedAgentData?.llm_model.model}</p>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-placeholder">
                  <p>Start a conversation with {selectedAgentData?.name}</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="message-content">{msg.content}</div>
                      {msg.toolsUsedNames && msg.toolsUsedNames.length > 0 && (
                        <div className="message-tools">
                          <small>Skills used: {msg.toolsUsedNames.join(', ')}</small>
                        </div>
                      )}
                    </div>
                  ))}
                  {isThinking && (
                    <div className="chat-message assistant thinking-message">
                      <div className="thinking-loader">
                        <span className="thinking-dot"></span>
                        <span className="thinking-dot"></span>
                        <span className="thinking-dot"></span>
                      </div>
                      <div className="thinking-text">Thinking...</div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="chat-input-container">
              <textarea
                className="chat-input"
                value={currentMessage}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSendMessage()
                  }
                }}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                rows={3}
              />
              <button 
                onClick={onSendMessage} 
                className="btn-primary chat-send"
                disabled={!currentMessage.trim() || isThinking}
              >
                {isThinking ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
