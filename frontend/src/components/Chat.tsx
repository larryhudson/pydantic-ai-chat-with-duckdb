import { useRef, useEffect, useState } from 'react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import './Chat.css';
import { useChat } from '@ai-sdk/react';
import { renderToolPart } from './ToolResults/toolRenderers';

export function Chat() {
  const {messages, sendMessage, status} = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:8000/chat',
    }),
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;

    sendMessage({ text: input });
    setInput('');
  };

  const renderMessage = (message: UIMessage) => {
    return (
      <div className="message-content">
        {message.parts?.map((part, idx) => {
          if (part.type === 'text') {
            return (
              <div key={idx} className="message-text">
                {part.text}
              </div>
            );
          }

          // Handle tool results using type-safe renderer
          const toolOutput = renderToolPart(part);
          if (toolOutput) {
            return <div key={idx}>{toolOutput}</div>;
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>FastAPI + Pydantic AI Chat</h1>
        <p>Streaming chat with tool support</p>
      </div>

      <details>
        <summary>Messages dump</summary>
        <pre className="messages-dump">{JSON.stringify(messages, null, 2)}</pre>
      </details>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            <div className="message-role">{message.role}</div>
            {renderMessage(message)}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the weather or anything else..."
          disabled={status !== 'ready'}
          className="chat-input"
        />
        <button type="submit" disabled={status !== 'ready' || !input.trim()} className="chat-submit">
          {status !== 'ready' ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
