import { useState } from 'react';
import './ToolResults.css';

interface ToolResultWrapperProps {
  toolName: string;
  toolOutput: unknown;
  children: React.ReactNode;
}

export function ToolResultWrapper({
  toolName,
  toolOutput,
  children,
}: ToolResultWrapperProps) {
  const [showJSON, setShowJSON] = useState(false);

  return (
    <div className="tool-result-wrapper">
      <div className="tool-result-toggle">
        <button
          className={`toggle-btn ${!showJSON ? 'active' : ''}`}
          onClick={() => setShowJSON(false)}
        >
          UI View
        </button>
        <button
          className={`toggle-btn ${showJSON ? 'active' : ''}`}
          onClick={() => setShowJSON(true)}
        >
          JSON View
        </button>
      </div>

      <div className="tool-result-container">
        {!showJSON ? (
          children
        ) : (
          <div className="json-view">
            <pre>{JSON.stringify(toolOutput, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
