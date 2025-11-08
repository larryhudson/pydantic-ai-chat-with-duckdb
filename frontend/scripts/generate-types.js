/**
 * Type Generator Script for Tool Outputs
 *
 * This script:
 * 1. Fetches JSON schemas from the backend's /tools-schema endpoint
 * 2. Converts each schema to TypeScript interfaces using json-schema-to-typescript
 * 3. Creates a ToolOutputTypes mapping for type-safe tool output access
 *
 * Run with: npm run generate:types
 *
 * When to run:
 * - After adding a new tool to the backend
 * - After modifying a tool's output Pydantic model
 * - Automatically runs before build (see package.json)
 */

import { compile } from 'json-schema-to-typescript';
import * as fs from 'fs';
import * as path from 'path';

// Backend URL - default to localhost, override with BACKEND_URL env var
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
// Output path for generated types
const OUTPUT_FILE = './src/types/tools.ts';

async function generateTypes() {
  try {
    console.log('Fetching tool schemas from backend...');
    const response = await fetch(`${BACKEND_URL}/tools-schema`);

    if (!response.ok) {
      throw new Error(`Failed to fetch schemas: ${response.statusText}`);
    }

    const data = await response.json();
    const tools = data.tools || {};

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate TypeScript interfaces for each tool's output schema
    let typeDefinitions = '/**\n * Auto-generated types from backend tool schemas\n * Do not edit manually - run "npm run generate:types" to update\n */\n\n';
    const toolOutputTypes = {};

    // Iterate through each tool and compile its output schema to TypeScript
    for (const [toolName, toolConfig] of Object.entries(tools)) {
      const toolData = toolConfig;
      if (toolData.output) {
        console.log(`Generating types for ${toolName}...`);
        // Convert JSON Schema to TypeScript code
        const tsCode = await compile(toolData.output, toolName, {
          bannerComment: '',
          enableConstEnums: false,
        });
        typeDefinitions += tsCode + '\n';

        // Extract the main interface name (usually PascalCase version of tool name)
        const typeMatch = tsCode.match(/export interface (\w+)/);
        if (typeMatch) {
          toolOutputTypes[toolName] = typeMatch[1];
        }
      }
    }

    // Generate the ToolOutputTypes mapping
    // This creates a discriminated union type like:
    //   export type ToolOutputTypes = {
    //     get_weather: Weather;
    //     another_tool: AnotherOutput;
    //   }
    // This allows frontend to access types as: ToolOutputTypes['get_weather']
    typeDefinitions += '\n// Tool output type mapping\n';
    typeDefinitions += '// Used in toolRenderers.tsx to ensure type safety\n';
    typeDefinitions += 'export type ToolOutputTypes = {\n';
    for (const [toolName, typeName] of Object.entries(toolOutputTypes)) {
      typeDefinitions += `  ${toolName}: ${typeName};\n`;
    }
    typeDefinitions += '};\n';

    // Write the generated types to the output file
    fs.writeFileSync(OUTPUT_FILE, typeDefinitions);
    console.log(`✓ Types generated successfully at ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Failed to generate types:', error.message);
    process.exit(1);
  }
}

generateTypes();
