import type { ToolOutputTypes } from '../../types/tools';
import './ToolResults.css';

interface SQLQueryResultProps {
  data: ToolOutputTypes['execute_sql'];
}

export function SQLQueryResult({ data }: SQLQueryResultProps) {
  if (!data.success) {
    return (
      <div className="tool-result sql-error">
        <div className="tool-result-header">❌ SQL Query Error</div>
        <div className="tool-result-content">
          <div className="query-display">
            <code>{data.query}</code>
          </div>
          <p className="error-message">{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-result sql-query">
      <div className="tool-result-header">
        📊 SQL Query Results ({data.row_count} row{data.row_count !== 1 ? 's' : ''})
        <span className="result-id">#{data.id}</span>
      </div>
      <div className="tool-result-content">
        <div className="query-display">
          <code>{data.query}</code>
        </div>
        {data.row_count === 0 ? (
          <p className="no-results">No results returned</p>
        ) : (
          <div className="table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {data.column_names.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={idx}>
                    {data.column_names.map((col) => (
                      <td key={`${idx}-${col}`}>
                        {formatValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format a cell value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    // Format numbers with commas for readability
    return new Intl.NumberFormat().format(value);
  }
  return String(value);
}
