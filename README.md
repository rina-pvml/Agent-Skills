# Agent Skills Tester

A full-stack application for creating and managing AI agents with customizable skills. Build agents, create reusable skills, and chat with AI models from OpenAI and Anthropic.
The goal is for you to play around with an example implementation of the Agent Skills concept to showcase its value, core capabilities, and benefits in production environments.

## Features

- 🤖 **Agent Management**: Create and configure AI agents with different LLM models
- 🛠️ **Custom Skills**: Create Agent Skills that can be called on-demand by the LLM
- 💬 **Interactive Chat**: Chat with your agents and see which skills were used
- 🎨 **UI**: Full interface built with React and TypeScript
- ⚡ **Fast Backend**: FastAPI backend with automatic skill detection

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher and npm
- OpenAI / Anthropic API key

## Installation

### 1. Clone or navigate to the project directory

```bash
cd llm-agent-app
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=sk-your-actual-key-here
# ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install Node dependencies
npm install
```

## Configuration

### API Keys

Edit the `.env` file in the `backend` directory:

```bash
cd backend
nano .env 
```

Add your API keys:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic API Key (optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

**Get your API keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

## Running the Application

### Start the Backend Server

Open a terminal and run:

```bash
cd backend
python main.py
```

The backend will start on `http://localhost:8000`

### Start the Frontend Server

Open a **second terminal** and run:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Usage Guide

I already created an example Skill and Agent!

The agent is called "Business Copilot" and its instructions are:
```text
You provide clear, concise business guidance. Keep responses brief, structured when helpful, and grounded in standard business logic. Request missing details only when required.
```

The Skill is called "Enterprise Pricing Strategy" and its instructions are:
```text
Pricing Playbook Output

Value Metric Fit Check

Evaluate the product across three axes: usage elasticity, buyer familiarity, scalability potential.

Tier Logic

Propose a three tier structure with named tiers using this naming pattern: Core, Growth, Scale.

Margin Guardrails

Provide a target gross margin range and a discount boundary.

Expansion Hooks

Identify two specific levers that raise ACV within 12 months.

Micro Case

Deliver a short, product specific example in two sentences.
```

To test it out:
1. Go to Chat and run:
```text
What's the role of a product manager?
```
This question does not require any skills and the LLM will answer it independently.

2. Now ask:
```text
We’re planning a mid market launch for our workflow automation platform. What pricing strategy should we use?
```
This time, the LLM should call the "Enterprise Pricing Strategy" Skill to gain the required knowledge and answer properly.


### 1. Create New Skills

1. Go to the **Skills** tab
2. Click **"+ Create Skill"**
3. Fill in:
   - **Name**: A descriptive name for your skill
   - **Description**: What this skill does
   - **Skill**: The knowledge/instructions for this skill
4. Click **"Create"**

### 2. Create Agents

1. Go to the **Agents** tab
2. Click **"+ Create Agent"**
3. Fill in:
   - **Name**: Your agent's name
   - **LLM Provider**: Choose OpenAI or Anthropic
   - **Model**: Select a model (e.g., GPT-4) - Note that turbo models like GPT 3.5 Turbo handle Skills less effectively because they focus on producing quick answers instead of planning how to use additional instructions. They often skip the extra reasoning step needed to decide when a Skill is relevant.
   - **System Prompt**: The base prompt for your agent
   - **Available Skills**: Select which Skills this agent can use
4. Click **"Create"**

### 3. Chat with Agents

1. Go to the **Chat** tab
2. Select an agent from the sidebar
3. Type your message and press Enter (or click Send)
4. The agent will respond, and you'll see which skills were used

## How It Works

### Skills System

Skills are knowledge pieces that get inserted into the main prompt on-demand.

**Example:**
- Sool: "Weather Helper" 
- User asks: "What's the weather today?" → Skill is included
- User asks: "Tell me a joke" → Skill is NOT included

### Agent Configuration

Each agent has:
- A selected LLM model (OpenAI or Anthropic)
- A system prompt (the base instructions)
- Available skills 

## Project Structure

```
llm-agent-app/
├── backend/
│   ├── main.py              # FastAPI backend server
│   ├── requirements.txt      # Python dependencies
│   ├── .env                 # Environment variables (API keys)
│   └── .env.example         # Example environment file
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── api.ts           # API client
│   │   ├── App.css          # Styles
│   │   └── main.tsx         # React entry point
│   ├── package.json         # Node dependencies
│   └── vite.config.ts        # Vite configuration
└── README.md                # This file
```

## Stopping the Servers

To stop the servers, press `Ctrl+C` in each terminal, or run:

```bash
# Stop backend
pkill -f "python main.py"

# Stop frontend
pkill -f "vite"
```

## Development

### Backend API

The backend provides REST API endpoints:

- `GET /api/models` - Get available LLM models
- `GET /api/tools` - Get all skills tools
- `POST /api/tools` - Create a skill tool
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create an agent
- `POST /api/agents/{id}/chat` - Chat with an agent

### Frontend

Built with:
- React 19
- TypeScript
- Vite
- Modern CSS with gradients and animations

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, check the browser console and backend terminal for error messages or [reach out to me via Linkedin](https://www.linkedin.com/in/rina-galperin/).

