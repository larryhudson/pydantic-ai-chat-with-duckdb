/**
 * Tool Output Type Utilities
 *
 * Provides type-safe helper functions for working with tool parts in the message stream.
 * These utilities help narrow and extract tool outputs with full TypeScript type inference.
 *
 * Note: Most use cases will use renderToolPart() in toolRenderers.tsx instead.
 * These utilities are available if you need custom tool part handling.
 */

import type { ToolOutputTypes } from './tools';

/**
 * Type guard to check if a part is a tool result and extract its output with correct typing
 *
 * Example:
 *   const weather = getToolOutput(part, 'get_weather');
 *   if (weather) {
 *     // weather is now typed as Weather
 *   }
 */
export function getToolOutput<T extends keyof ToolOutputTypes>(
  part: unknown,
  toolName: T
): ToolOutputTypes[T] | null {
  if (
    typeof part === 'object' &&
    part !== null &&
    (part as Record<string, unknown>).type === `tool-${toolName}` &&
    (part as Record<string, unknown>).output
  ) {
    return (part as Record<string, unknown>).output as ToolOutputTypes[T];
  }
  return null;
}

/**
 * Type predicate for narrowing tool parts in conditional branches
 *
 * This is a stricter type guard that narrows the part type in TypeScript.
 *
 * Example:
 *   if (isToolPart(part, 'get_weather')) {
 *     // part is now { type: string; output: Weather }
 *     const weather = part.output;
 *   }
 */
export function isToolPart<T extends keyof ToolOutputTypes>(
  part: unknown,
  toolName: T
): part is { type: string; output: ToolOutputTypes[T] } {
  return (
    typeof part === 'object' &&
    part !== null &&
    (part as Record<string, unknown>).type === `tool-${toolName}`
  );
}
