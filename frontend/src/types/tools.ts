/**
 * Auto-generated types from backend tool schemas
 * Do not edit manually - run "npm run generate:types" to update
 */

export type Id = string;
export type Success = boolean;
export type Query = string;
export type Rows = {
  [k: string]: unknown;
}[];
export type RowCount = number;
export type Error = string | null;
export type ColumnNames = string[];

/**
 * SQL query result model.
 */
export interface SQLQueryResult {
  id: Id;
  success: Success;
  query: Query;
  rows: Rows;
  row_count: RowCount;
  error?: Error;
  column_names?: ColumnNames;
  [k: string]: unknown;
}

export type Success = boolean;
export type ChartId = string;
export type ChartType = string;
export type Rows = {
  [k: string]: unknown;
}[];
export type ChartType1 = string;
export type XKey = string;
export type YKeys = string[];
export type Title = string | null;
export type XLabel = string | null;
export type YLabel = string | null;
export type Error = string | null;

/**
 * Chart rendering result.
 */
export interface ChartResult {
  success: Success;
  chart_id: ChartId;
  chart_type: ChartType;
  rows: Rows;
  config: ChartConfig;
  error?: Error;
  [k: string]: unknown;
}
/**
 * Chart rendering configuration.
 */
export interface ChartConfig {
  chart_type: ChartType1;
  x_key: XKey;
  y_keys: YKeys;
  title?: Title;
  x_label?: XLabel;
  y_label?: YLabel;
  [k: string]: unknown;
}


// Tool output type mapping
// Used in toolRenderers.tsx to ensure type safety
export type ToolOutputTypes = {
  execute_sql: SQLQueryResult;
  render_chart: ChartResult;
};
