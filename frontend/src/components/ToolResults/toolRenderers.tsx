import type { ToolOutputTypes } from '../../types/tools';
import { WeatherResult } from './WeatherResult';
import { SQLQueryResult } from './SQLQueryResult';
import { ChartResult } from './ChartResult';
import { ToolResultWrapper } from './ToolResultWrapper';

/**
 * Typed map of tool names to their renderer components
 * Each renderer is a function that takes the typed output and returns React nodes
 *
 * To add a new tool:
 * 1. Add it to the backend as a Pydantic model and @agent.tool_plain function
 * 2. Add it to the /tools-schema endpoint in backend/main.py
 * 3. Run: npm run generate:types (this will update ToolOutputTypes)
 * 4. Create a new component (e.g., MyToolResult.tsx)
 * 5. Add the renderer to this map - TypeScript will enforce correct types for each tool
 */
type ToolRendererMapType = {
  [K in keyof ToolOutputTypes]: (data: ToolOutputTypes[K]) => React.ReactNode;
};

const toolRenderers = {
  get_weather: (data: ToolOutputTypes['get_weather']) => <WeatherResult data={data} />,
  execute_sql: (data: ToolOutputTypes['execute_sql']) => <SQLQueryResult data={data} />,
  render_chart: (data: ToolOutputTypes['render_chart']) => <ChartResult data={data} />,
  // Add new tool renderers here - TypeScript enforces each has the correct data type
} satisfies ToolRendererMapType;

/**
 * Check if a tool renderer exists for the given tool name
 */
function hasToolRenderer(toolName: string): toolName is keyof typeof toolRenderers {
  return toolName in toolRenderers;
}

/**
 * Safely call a tool renderer with type coercion
 * Called only after we've validated that the toolName exists and output is valid
 */
function callToolRenderer(
  toolName: keyof typeof toolRenderers,
  output: unknown
): React.ReactNode {
  // We've already validated that output is an object at the call site,
  // and we know toolName is a valid key, so it's safe to coerce here
  return (toolRenderers[toolName] as (data: unknown) => React.ReactNode)(output);
}

/**
 * Render a tool part from the message stream
 * Safely extracts tool name and output, then dispatches to the appropriate renderer component
 * Wraps the output in a toggle-able wrapper for UI/JSON views
 */
export function renderToolPart(part: unknown): React.ReactNode | null {
  if (typeof part !== 'object' || part === null) {
    return null;
  }

  const partObj = part as Record<string, unknown>;
  const type = partObj.type;
  const output = partObj.output;

  if (typeof type !== 'string' || !type.startsWith('tool-')) {
    return null;
  }

  const toolName = type.slice(5); // Remove "tool-" prefix

  // Check if we have a renderer for this tool
  if (!hasToolRenderer(toolName)) {
    console.warn(`No renderer found for tool: ${toolName}`);
    return null;
  }

  // Validate output exists
  if (typeof output !== 'object' || output === null) {
    console.warn(`Invalid output for tool: ${toolName}`);
    return null;
  }

  // Dispatch to the appropriate renderer and wrap in toggle wrapper
  const rendered = callToolRenderer(toolName, output);
  return (
    <ToolResultWrapper toolName={toolName} toolOutput={output}>
      {rendered}
    </ToolResultWrapper>
  );
}
