# FastAPI + Pydantic AI Streaming Chat

A minimal demonstration of end-to-end type-safe streaming chat using:
- **FastAPI + Pydantic AI** backend with tool support
- **Vercel AI Data Stream Protocol** for streaming responses
- **Vercel AI SDK** frontend with automatic type safety
- **React** frontend with real-time streaming UI

## Quick Start

### Using Makefile (Recommended)

```bash
# Install all dependencies
make install

# Run both backend and frontend together
make dev
```

### Manual Setup

**Backend** (uses [uv](https://docs.astral.sh/uv/))

```bash
cd backend
uv sync
cp .env.example .env  # Add your AWS credentials
uv run fastapi dev main.py
```

Backend runs at `http://localhost:8000`

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## Key Features

### Type-Safe Tool Outputs
- **Backend**: Define Pydantic models for tool outputs (e.g., `Weather` class)
- **Schema Endpoint**: `/tools-schema` exports JSON schemas mapping tool names to output types
- **Code Generation**: `npm run generate:types` auto-generates TypeScript types from backend schemas
- **Type Safety**: Frontend receives `ToolOutputTypes` mapping with full type inference
- **No Manual Syncing**: Types stay in sync automatically - update backend model → regenerate types

### Streaming Implementation
- **Backend**: Uses `VercelAIAdapter.dispatch_request()` to handle Vercel AI protocol
- **Frontend**: Uses `@ai-sdk/react` `useChat()` hook for automatic streaming handling
- **Real-time**: Text appears character-by-character as it's generated

### Message Handling
- **Tool support**: Backend `@agent.tool_plain` decorated functions with Pydantic output types
- **Tool Rendering**: Component map routes tool names to React components for custom display
- **Message history**: Automatically maintained by Vercel AI SDK
- **Type-safe**: Pydantic AI messages automatically converted to Vercel AI format

## Project Structure

```
├── backend/
│   ├── main.py                    # FastAPI app with Pydantic AI + /tools-schema endpoint
│   └── pyproject.toml             # Dependencies
└── frontend/
    ├── src/
    │   ├── types/
    │   │   ├── tools.ts           # Auto-generated tool output types
    │   │   └── tool-utils.ts      # Type guard helpers
    │   ├── components/
    │   │   ├── Chat.tsx           # Main chat UI component
    │   │   └── ToolResults/       # Tool-specific rendering components
    │   │       ├── WeatherResult.tsx
    │   │       └── toolRenderers.tsx  # Component routing map
    │   └── App.tsx
    ├── scripts/
    │   └── generate-types.js      # Type generation script
    └── package.json
```

## How Type-Safe Tool Outputs Work

### 1. Backend - Define Tool Output Type (Pydantic Model)
**File**: `backend/main.py:16-21`

```python
class Weather(BaseModel):
    """Weather data model."""
    city: str
    condition: str
    temperature: float
    unit: str = "F"

@agent.tool_plain
def get_weather(city: str) -> Weather:
    """Get the weather for a city."""
    return Weather(city=city, condition="Sunny", temperature=72.0)
```

### 2. Backend - Export Schema Endpoint
**File**: `backend/main.py:51-60`

Creates a `/tools-schema` endpoint that maps tool names to their output JSON schemas:

```python
@app.get("/tools-schema")
def tools_schema():
    """Export JSON schemas for all tool output types with tool name mapping."""
    return {
        "tools": {
            "get_weather": {
                "output": Weather.model_json_schema(),
            }
        }
    }
```

### 3. Frontend - Generate Types from Schema
**File**: `frontend/scripts/generate-types.js`

Run `npm run generate:types` to:
1. Fetch schemas from `/tools-schema` endpoint
2. Use `json-schema-to-typescript` to generate TypeScript interfaces
3. Create a `ToolOutputTypes` mapping for type-safe access

**Generated**: `frontend/src/types/tools.ts`
```typescript
export interface Weather {
  city: City;
  condition: Condition;
  temperature: Temperature;
  unit?: Unit;
}

export type ToolOutputTypes = {
  get_weather: Weather;
};
```

### 4. Frontend - Render Tool Results Type-Safely
**File**: `frontend/src/components/ToolResults/toolRenderers.tsx`

```typescript
export function renderToolPart(part: unknown): React.ReactNode | null {
  // Type-safe dispatch to specific tool renderers
  if (toolName === 'get_weather' && typeof output === 'object') {
    return <WeatherResult data={output as ToolOutputTypes['get_weather']} />;
  }
  return null;
}
```

**File**: `frontend/src/components/Chat.tsx`
```typescript
const toolOutput = renderToolPart(part);
if (toolOutput) {
  return <div key={idx}>{toolOutput}</div>;
}
```

## Adding a New Tool

When you add a new tool to the backend, follow these steps to get full type safety on the frontend:

### 1. Backend Setup
Define a Pydantic model for the tool's output and create the tool function:

```python
# backend/main.py

class MyToolOutput(BaseModel):
    """Output model for my_tool."""
    result: str
    data: int

@agent.tool_plain
def my_tool(param: str) -> MyToolOutput:
    """Description of what my_tool does."""
    return MyToolOutput(result="done", data=42)
```

### 2. Export Schema
Add the tool to the `/tools-schema` endpoint:

```python
@app.get("/tools-schema")
def tools_schema():
    return {
        "tools": {
            "my_tool": {
                "output": MyToolOutput.model_json_schema(),
            },
            "get_weather": {
                "output": Weather.model_json_schema(),
            }
        }
    }
```

### 3. Generate Frontend Types
```bash
cd frontend
npm run generate:types
```

This fetches schemas from `/tools-schema` and generates TypeScript interfaces in `src/types/tools.ts`.

### 4. Create Renderer Component
```typescript
// frontend/src/components/ToolResults/MyToolResult.tsx

import type { ToolOutputTypes } from '../../types/tools';

interface MyToolResultProps {
  data: ToolOutputTypes['my_tool'];
}

export function MyToolResult({ data }: MyToolResultProps) {
  return <div>Result: {data.result}, Data: {data.data}</div>;
}
```

### 5. Add to Renderer Map
```typescript
// frontend/src/components/ToolResults/toolRenderers.tsx

import { MyToolResult } from './MyToolResult';

const toolRenderers = {
  get_weather: (data: ToolOutputTypes['get_weather']) => <WeatherResult data={data} />,
  my_tool: (data: ToolOutputTypes['my_tool']) => <MyToolResult data={data} />,
} satisfies ToolRendererMapType;
```

That's it! The tool is now fully type-safe end-to-end.

## Available Commands

- `make dev` - Run both backend and frontend
- `make backend` - Run backend only
- `make frontend` - Run frontend only
- `make install` - Install all dependencies
- `make generate-api` - Regenerate TypeScript client
- `make clean` - Clean generated files
- `make help` - Show all commands

## Documentation

See [GUIDE.md](./GUIDE.md) for detailed tutorial with step-by-step implementation guide.
