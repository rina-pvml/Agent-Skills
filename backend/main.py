from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import re
from dotenv import load_dotenv
import openai
from anthropic import Anthropic

load_dotenv()

app = FastAPI(title="Agent Skills Tester")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# In-memory storage (replace with database in production)
agents_db: Dict[str, Dict] = {}
tools_db: Dict[str, Dict] = {}

# Initialize example data
def initialize_examples():
    """Initialize example tools and agents for users"""
    import uuid
    
    # Check if examples already exist
    if tools_db or agents_db:
        return  # Don't reinitialize if data already exists
    
    # Create example tool: Enterprise Pricing Strategy
    pricing_tool_id = str(uuid.uuid4())
    pricing_tool = {
        "id": pricing_tool_id,
        "name": "Enterprise Pricing Strategy",
        "description": "Activate this for pricing questions",
        "prompt_piece": """Pricing Playbook Output

Value Metric Fit Check

Evaluate the product across three axes: usage elasticity, buyer familiarity, scalability potential.

Tier Logic

Propose a three tier structure with named tiers using this naming pattern: Core, Growth, Scale.

Margin Guardrails

Provide a target gross margin range and a discount boundary.

Expansion Hooks

Identify two specific levers that raise ACV within 12 months.

Micro Case

Deliver a short, product specific example in two sentences.""",
    }
    tools_db[pricing_tool_id] = pricing_tool
    
    # Create example agent: Business Copilot
    business_copilot_id = str(uuid.uuid4())
    business_copilot = {
        "id": business_copilot_id,
        "name": "Business Copilot",
        "llm_model": {
            "provider": "openai",
            "model": "gpt-4"
        },
        "system_prompt": "You provide clear, concise business guidance. Keep responses brief, structured when helpful, and grounded in standard business logic. Request missing details only when required.",
        "tool_ids": [pricing_tool_id]
    }
    agents_db[business_copilot_id] = business_copilot

# Initialize examples on startup
initialize_examples()

# Models
class LLMModel(BaseModel):
    provider: str  # "openai", "anthropic"
    model: str  # e.g., "gpt-4", "claude-3-opus"

class Tool(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    prompt_piece: str

class Agent(BaseModel):
    id: Optional[str] = None
    name: str
    llm_model: LLMModel
    system_prompt: str
    tool_ids: List[str] = []

class AgentRequest(BaseModel):
    agent_id: str
    user_message: str

class ToolCreate(BaseModel):
    name: str
    description: str
    prompt_piece: str

class AgentCreate(BaseModel):
    name: str
    llm_model: LLMModel
    system_prompt: str
    tool_ids: List[str] = []


# Helper function to build prompt with tool metadata only
def build_prompt_with_tool_metadata(system_prompt: str, user_message: str, tool_ids: List[str]) -> str:
    """Build the prompt with only tool names and descriptions (not full content)."""
    tool_list = []
    for tool_id in tool_ids:
        if tool_id in tools_db:
            tool = tools_db[tool_id]
            tool_list.append(f"- {tool['name']}: {tool['description']}")
    
    if tool_list:
        tools_section = "\n\nAvailable Tools:\n" + "\n".join(tool_list)
        tools_section += "\n\nTo use a tool, include [USE_TOOL: ToolName] in your response. The tool's detailed content will then be provided to you. Do not mention this format to the user."
    else:
        tools_section = ""
    
    full_prompt = f"{system_prompt}{tools_section}\n\nUser: {user_message}\n\nAssistant:"
    return full_prompt

# Helper function to build prompt with full tool content
def build_prompt_with_tool_content(system_prompt: str, user_message: str, tool_ids: List[str]) -> str:
    """Build the prompt with full tool content included."""
    tool_pieces = []
    for tool_id in tool_ids:
        if tool_id in tools_db:
            tool = tools_db[tool_id]
            tool_pieces.append(f"\n\n[{tool['name']}]\n{tool['prompt_piece']}")
    
    tools_section = "\n".join(tool_pieces) if tool_pieces else ""
    
    # Instruction to use information naturally without mentioning tools
    if tools_section:
        instruction = "\n\nUse the information provided above naturally in your response. Do not mention that you are using tools or referencing specific resources - just provide a helpful answer using the available information."
    else:
        instruction = ""
    
    full_prompt = f"{system_prompt}{tools_section}{instruction}\n\nUser: {user_message}\n\nAssistant:"
    return full_prompt

# Helper function to call LLM
async def call_llm(model: LLMModel, prompt: str) -> str:
    """Call the appropriate LLM based on provider"""
    if model.provider == "openai":
        response = openai_client.chat.completions.create(
            model=model.model,
            messages=[
                {"role": "system", "content": prompt.split("User:")[0].strip()},
                {"role": "user", "content": prompt.split("User:")[-1].replace("Assistant:", "").strip()}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    elif model.provider == "anthropic":
        system_content = prompt.split("User:")[0].strip()
        user_content = prompt.split("User:")[-1].replace("Assistant:", "").strip()
        response = anthropic_client.messages.create(
            model=model.model,
            max_tokens=1024,
            system=system_content,
            messages=[{"role": "user", "content": user_content}]
        )
        return response.content[0].text
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {model.provider}")

# API Routes

@app.get("/")
async def root():
    return {"message": "Agent Skills Tester API"}

@app.get("/api/models")
async def get_available_models():
    """Get list of available LLM models"""
    return {
        "openai": [
            {"model": "gpt-4", "name": "GPT-4"},
            {"model": "gpt-4-turbo-preview", "name": "GPT-4 Turbo"},
            {"model": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
        ],
        "anthropic": [
            {"model": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
            {"model": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
            {"model": "claude-3-haiku-20240229", "name": "Claude 3 Haiku"},
        ]
    }

@app.post("/api/tools", response_model=Tool)
async def create_tool(tool: ToolCreate):
    """Create a new tool/prompt piece"""
    import uuid
    tool_id = str(uuid.uuid4())
    tool_data = {
        "id": tool_id,
        "name": tool.name,
        "description": tool.description,
        "prompt_piece": tool.prompt_piece
    }
    tools_db[tool_id] = tool_data
    return tool_data

@app.get("/api/tools", response_model=List[Tool])
async def get_tools():
    """Get all tools"""
    return list(tools_db.values())

@app.get("/api/tools/{tool_id}", response_model=Tool)
async def get_tool(tool_id: str):
    """Get a specific tool"""
    if tool_id not in tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tools_db[tool_id]

@app.put("/api/tools/{tool_id}", response_model=Tool)
async def update_tool(tool_id: str, tool: ToolCreate):
    """Update a tool"""
    if tool_id not in tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    tools_db[tool_id] = {
        "id": tool_id,
        "name": tool.name,
        "description": tool.description,
        "prompt_piece": tool.prompt_piece
    }
    return tools_db[tool_id]

@app.delete("/api/tools/{tool_id}")
async def delete_tool(tool_id: str):
    """Delete a tool"""
    if tool_id not in tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    del tools_db[tool_id]
    return {"message": "Tool deleted"}

@app.post("/api/agents", response_model=Agent)
async def create_agent(agent: AgentCreate):
    """Create a new agent"""
    import uuid
    agent_id = str(uuid.uuid4())
    agent_data = {
        "id": agent_id,
        "name": agent.name,
        "llm_model": agent.llm_model.dict(),
        "system_prompt": agent.system_prompt,
        "tool_ids": agent.tool_ids
    }
    agents_db[agent_id] = agent_data
    return agent_data

@app.get("/api/agents", response_model=List[Agent])
async def get_agents():
    """Get all agents"""
    return list(agents_db.values())

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get a specific agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents_db[agent_id]

@app.put("/api/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, agent: AgentCreate):
    """Update an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    agents_db[agent_id] = {
        "id": agent_id,
        "name": agent.name,
        "llm_model": agent.llm_model.dict(),
        "system_prompt": agent.system_prompt,
        "tool_ids": agent.tool_ids
    }
    return agents_db[agent_id]

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    del agents_db[agent_id]
    return {"message": "Agent deleted"}

@app.post("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: str, request: AgentRequest):
    """Chat with an agent - automatically detects and uses relevant tools"""
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agents_db[agent_id]
    llm_model = LLMModel(**agent["llm_model"])
    
    # Validate model is set
    if not llm_model.model or llm_model.model.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="Agent model is not set. Please select a model for this agent."
        )
    
    # Validate API key is set
    if llm_model.provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file."
            )
    elif llm_model.provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key or api_key == "your_anthropic_api_key_here":
            raise HTTPException(
                status_code=400,
                detail="Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your .env file."
            )
    
    # Get all tools associated with this agent
    agent_tool_ids = agent["tool_ids"]
    
    # Step 1: Show tool metadata (names and descriptions) to the model
    initial_prompt = build_prompt_with_tool_metadata(
        agent["system_prompt"],
        request.user_message,
        agent_tool_ids
    )
    
    # Step 2: First LLM call - model sees available tools and can request them
    try:
        initial_response = await call_llm(llm_model, initial_prompt)
        
        # Step 3: Detect which tools the model requested using [USE_TOOL: ToolName] format
        requested_tool_ids = []
        tool_markers = re.findall(r'\[USE_TOOL:\s*([^\]]+)\]', initial_response, re.IGNORECASE)
        
        # Match tool names from markers
        for marker_tool_name in tool_markers:
            marker_tool_name_lower = marker_tool_name.strip().lower()
            for tool_id in agent_tool_ids:
                if tool_id in tools_db:
                    tool = tools_db[tool_id]
                    if tool['name'].lower() == marker_tool_name_lower:
                        if tool_id not in requested_tool_ids:
                            requested_tool_ids.append(tool_id)
        
        # Step 4: If model requested tools, make second call with tool content
        if requested_tool_ids:
            final_prompt = build_prompt_with_tool_content(
                agent["system_prompt"],
                request.user_message,
                requested_tool_ids
            )
            final_response = await call_llm(llm_model, final_prompt)
            # Remove tool markers from the final response
            response = re.sub(r'\[USE_TOOL:\s*[^\]]+\]', '', final_response, flags=re.IGNORECASE).strip()
            tools_used = requested_tool_ids
            full_prompt = final_prompt
        else:
            # No tools requested, use initial response but remove any markers
            response = re.sub(r'\[USE_TOOL:\s*[^\]]+\]', '', initial_response, flags=re.IGNORECASE).strip()
            tools_used = []
            full_prompt = initial_prompt
    except Exception as e:
        error_msg = str(e)
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail=f"API authentication failed: {error_msg}. Please check your API key."
            )
        elif "model" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail=f"Model error: {error_msg}. Please check the model name."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"LLM API error: {error_msg}"
            )
    
    # Get tool names for the response
    tool_names = []
    for tool_id in tools_used:
        if tool_id in tools_db:
            tool_names.append(tools_db[tool_id]['name'])
    
    return {
        "response": response,
        "tools_used": tools_used,
        "tools_used_names": tool_names,
        "full_prompt": full_prompt
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

