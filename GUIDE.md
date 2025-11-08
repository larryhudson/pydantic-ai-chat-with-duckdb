# FastAPI + Pydantic AI Streaming Chat Guide

A minimal, type-safe streaming chat API with FastAPI, Pydantic AI, and TypeScript client generation.

## Overview

This guide shows you how to build a streaming chat API that:
- ✅ Uses Pydantic AI's native message types for full type safety
- ✅ Supports tool calls with real-time feedback
- ✅ Maintains conversation history
- ✅ Auto-generates TypeScript client from OpenAPI schema
- ✅ Keeps code minimal and simple

## Prerequisites

```bash
# Python dependencies
pip install fastapi uvicorn pydantic-ai

# TypeScript/Node dependencies
npm install -g @openapitools/openapi-generator-cli
```

## Backend Setup

### 1. Create the FastAPI Application

Create `main.py`:

```python
# main.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic import BaseModel
from typing import List
import json

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create agent with tools
agent = Agent('openai:gpt-4o')

@agent.tool
async def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"Weather in {city}: Sunny, 72°F"


class ChatRequest(BaseModel):
    messages: List[ModelMessage]  # Pydantic AI's native type

class ChatEvent(BaseModel):
    type: str  # 'delta' | 'complete'
    data: dict


@app.post("/chat")
async def chat(request: ChatRequest):
    """Simple streaming chat endpoint."""
    async def generate():
        # Run agent with message history
        async with agent.run_stream(
            request.messages[-1],  # Last message
            message_history=request.messages[:-1]  # Everything before
        ) as response:
            # Stream text deltas
            async for delta in response.stream_text(delta=True):
                event = ChatEvent(type="delta", data={"text": delta})
                yield f"data: {event.model_dump_json()}\n\n"
            
            # Send all messages when complete
            event = ChatEvent(
                type="complete",
                data={"messages": [m.model_dump(mode='json') for m in response.all_messages()]}
            )
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 2. Test the Backend

```bash
# Run the server
python main.py

# Server will start at http://localhost:8000
# API docs available at http://localhost:8000/docs
```

## Generate OpenAPI Schema & TypeScript Client

### 3. Export OpenAPI Schema

Create `export_openapi.py`:

```python
# export_openapi.py
import json
from main import app

if __name__ == "__main__":
    schema = app.openapi()
    with open("openapi.json", "w") as f:
        json.dump(schema, f, indent=2)
    print("✅ Generated openapi.json")
```

Run it:

```bash
python export_openapi.py
```

### 4. Generate TypeScript Client

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./src/api \
  --additional-properties=supportsES6=true,withInterfaces=true,useSingleRequestParameter=true
```

This generates TypeScript types that match Pydantic AI's message structure exactly!

## Frontend Implementation

### 5. Create Chat Hook

Create `src/hooks/useChat.ts`:

```typescript
// src/hooks/useChat.ts
import { useState, useCallback } from 'react';
import { ModelMessage, ModelRequest, UserPromptPart } from '../api';

interface ChatEvent {
  type: 'delta' | 'complete';
  data: any;
}

export function useChat() {
  const [messages, setMessages] = useState<ModelMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(async (text: string) => {
    setIsLoading(true);
    
    // Create user message using Pydantic AI's format
    const userMsg: ModelRequest = {
      kind: 'request',
      parts: [{ 
        part_kind: 'user-prompt', 
        content: text,
        timestamp: new Date().toISOString(),
      }],
    };

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setStreaming('');

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const event: ChatEvent = JSON.parse(line.slice(6));
          
          if (event.type === 'delta') {
            setStreaming(prev => prev + event.data.text);
          } else if (event.type === 'complete') {
            setMessages(event.data.messages);
            setStreaming('');
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, streaming, isLoading, send };
}
```

### 6. Create Chat Component

Create `src/components/Chat.tsx`:

```typescript
// src/components/Chat.tsx
import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ModelRequest, ModelResponse } from '../api';

export function Chat() {
  const { messages, streaming, isLoading, send } = useChat();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      send(input);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            {/* User messages */}
            {msg.kind === 'request' && (
              <div className="user-message">
                <strong>You:</strong>
                {(msg as ModelRequest).parts
                  .filter(p => p.part_kind === 'user-prompt')
                  .map((p, j) => <p key={j}>{p.content}</p>)}
              </div>
            )}
            
            {/* Assistant messages */}
            {msg.kind === 'response' && (
              <div className="assistant-message">
                <strong>Assistant:</strong>
                {(msg as ModelResponse).parts.map((part, j) => (
                  <div key={j}>
                    {/* Regular text */}
                    {part.part_kind === 'text' && <p>{part.content}</p>}
                    
                    {/* Tool calls */}
                    {part.part_kind === 'tool-call' && (
                      <div className="tool-call">
                        🔧 Calling: <code>{part.tool_name}</code>
                        <pre>{JSON.stringify(part.args, null, 2)}</pre>
                      </div>
                    )}
                    
                    {/* Tool results */}
                    {part.part_kind === 'tool-return' && (
                      <div className="tool-return">
                        ✅ Result: <code>{part.tool_name}</code>
                        <p>{part.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Show streaming text in real-time */}
        {streaming && (
          <div className="streaming-message">
            <strong>Assistant:</strong>
            <p>{streaming}</p>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

### 7. Add Basic Styles (Optional)

Create `src/components/Chat.css`:

```css
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.message {
  margin-bottom: 20px;
}

.user-message {
  background: #e3f2fd;
  padding: 12px;
  border-radius: 8px;
  margin-left: 20%;
}

.assistant-message {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-right: 20%;
}

.streaming-message {
  background: #fff9c4;
  padding: 12px;
  border-radius: 8px;
  margin-right: 20%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.tool-call {
  background: #e8eaf6;
  padding: 8px;
  border-radius: 4px;
  margin: 8px 0;
  font-size: 0.9em;
}

.tool-return {
  background: #e8f5e9;
  padding: 8px;
  border-radius: 4px;
  margin: 8px 0;
  font-size: 0.9em;
}

.input-form {
  display: flex;
  gap: 8px;
}

.input-form input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.input-form button {
  padding: 12px 24px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.input-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

pre {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 2px;
}
```

## Project Structure

```
project/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── export_openapi.py       # Schema generator
│   └── openapi.json            # Generated schema
│
└── frontend/
    ├── src/
    │   ├── api/                # Generated TypeScript client
    │   │   ├── api.ts
    │   │   ├── models.ts
    │   │   └── ...
    │   ├── hooks/
    │   │   └── useChat.ts      # Chat hook
    │   └── components/
    │       ├── Chat.tsx        # Chat component
    │       └── Chat.css        # Styles
    └── package.json
```

## Workflow

### Development Workflow

1. **Modify backend** - Add tools, change agent behavior
2. **Regenerate schema** - Run `python export_openapi.py`
3. **Regenerate client** - Run the openapi-generator command
4. **TypeScript updates automatically** - Types stay in sync!

### Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "generate-api": "python ../backend/export_openapi.py && npx @openapitools/openapi-generator-cli generate -i ../backend/openapi.json -g typescript-axios -o ./src/api --additional-properties=supportsES6=true,withInterfaces=true,useSingleRequestParameter=true",
    "dev": "vite",
    "build": "tsc && vite build"
  }
}
```

## Key Features

### Type Safety
- Pydantic AI message types → OpenAPI schema → TypeScript types
- Compile-time type checking in both Python and TypeScript
- No manual type definitions needed

### Real-time Streaming
- See text appear character by character
- Tool calls visible as they happen
- Tool results displayed immediately

### Message History
- Full conversation context maintained
- Tool calls and returns preserved
- Easy to implement "continue conversation" feature

### Minimal Code
- ~50 lines backend
- ~60 lines frontend hook
- ~80 lines frontend component
- No complex state management needed

## Adding More Tools

Simply add more `@agent.tool` decorated functions:

```python
@agent.tool
async def calculate(expression: str) -> float:
    """Evaluate a mathematical expression."""
    return eval(expression)  # Use safely in production!

@agent.tool
async def search_web(query: str) -> str:
    """Search the web for information."""
    # Implement web search
    return f"Search results for: {query}"
```

The types will automatically flow through to TypeScript!

## Environment Variables

Set your API key:

```bash
# .env
OPENAI_API_KEY=your-key-here
```

Load it in Python:

```python
import os
from dotenv import load_dotenv

load_dotenv()
# Pydantic AI will automatically use OPENAI_API_KEY
```

## Troubleshooting

### CORS Issues
Make sure CORS middleware is configured in FastAPI:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Streaming Not Working
Check that you're using `text/event-stream` media type and proper SSE format:
```python
yield f"data: {json}\n\n"  # Two newlines required!
```

### Types Not Matching
Regenerate both OpenAPI schema and TypeScript client:
```bash
python export_openapi.py
npm run generate-api
```

## Next Steps

- Add authentication
- Persist conversations to database
- Add rate limiting
- Deploy to production
- Add more sophisticated tools
- Implement streaming with WebSockets (alternative to SSE)

## Resources

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)