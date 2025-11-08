# main.py
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.ui.vercel_ai import VercelAIAdapter
from pydantic_ai.exceptions import ModelRetry
from dotenv import load_dotenv
import duckdb
from pathlib import Path
from typing import Any
import uuid

# Load environment variables
load_dotenv()

# Database configuration
DB_PATH = "data.duckdb"

# Cache for SQL query results (keyed by result ID)
# Stores rows so they can be referenced by render_chart tool
query_results_cache: dict[str, list[dict[str, Any]]] = {}


class Weather(BaseModel):
    """Weather data model."""

    city: str
    condition: str
    temperature: float
    unit: str = "F"


class SQLQueryResult(BaseModel):
    """SQL query result model."""

    id: str
    success: bool
    query: str
    rows: list[dict[str, Any]]
    row_count: int
    error: str | None = None
    column_names: list[str] = []


class ChartConfig(BaseModel):
    """Chart rendering configuration."""

    chart_type: str  # e.g., "line", "bar", "pie", "area", "scatter"
    x_key: str  # Column name for x-axis
    y_keys: list[str]  # Column names for y-axis (can be multiple for grouped charts)
    title: str | None = None
    x_label: str | None = None
    y_label: str | None = None


class ChartResult(BaseModel):
    """Chart rendering result."""

    success: bool
    chart_id: str
    chart_type: str
    rows: list[dict[str, Any]]
    config: ChartConfig
    error: str | None = None
    explanation: str | None = None


app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create agent with tools
agent = Agent(model="anthropic:claude-haiku-4-5-20251001")


@agent.tool_plain
def execute_sql(query: str) -> SQLQueryResult:
    """Execute a SQL query against a DuckDB database and return the results.

    Args:
        query: The SQL query to execute

    Returns:
        SQLQueryResult containing the query results or error information
    """
    result_id = str(uuid.uuid4())[:8]  # Short UUID for readability

    try:
        # Connect to the database
        conn = duckdb.connect(str(DB_PATH))

        # Execute the query
        result = conn.execute(query).fetchall()

        # Get column names from the query description
        col_names = [desc[0] for desc in conn.description] if conn.description else []

        # Convert rows to list of dictionaries
        rows = [dict(zip(col_names, row)) for row in result]

        conn.close()

        # Cache the result for use by render_chart tool
        query_results_cache[result_id] = rows

        return SQLQueryResult(
            id=result_id,
            success=True,
            query=query,
            rows=rows,
            row_count=len(rows),
            column_names=col_names,
            error=None,
        )
    except Exception as e:
        raise ModelRetry(f"Failed to execute SQL query: {str(e)}")


@agent.tool_plain
def render_chart(
    result_id: str,
    chart_type: str,
    x_key: str,
    y_keys: list[str],
    title: str | None = None,
    x_label: str | None = None,
    y_label: str | None = None,
    explanation: str | None = None,
) -> ChartResult:
    """Render a chart from a cached SQL query result.

    Supports multiple chart types for visualizing SQL query results:

    Cartesian Charts (with x/y axes):
    - "line": Line chart for showing trends over time or continuous data
    - "bar": Bar chart for comparing categorical values
    - "area": Area chart (stacked line) for showing cumulative trends
    - "scatter": Scatter chart for showing relationship between two variables
    - "composed": Composite chart combining multiple chart types

    Polar Charts:
    - "radar": Radar chart (spider/web chart) for multivariate data comparison
    - "radial_bar": Circular bar chart for categorical comparisons in polar coordinates

    Other Chart Types:
    - "pie": Pie chart for showing proportions of a whole
    - "funnel": Funnel chart for showing progressive filtering/conversion
    - "treemap": Treemap for hierarchical/proportional data visualization
    - "sankey": Sankey diagram for showing flow/relationships between categories

    Args:
        result_id: The ID of a previous SQL query result (e.g., from execute_sql)
        chart_type: Type of chart (see supported types above)
        x_key: Column name to use for x-axis (or category for pie/funnel/treemap)
        y_keys: Column names to use for y-axis values
        title: Optional chart title
        x_label: Optional x-axis label
        y_label: Optional y-axis label
        explanation: Optional explanation of what the chart shows

    Returns:
        ChartResult containing the chart configuration and data
    """
    try:
        # Look up the cached result
        if result_id not in query_results_cache:
            raise ValueError(f"Result '{result_id}' not found. Make sure you reference a valid result ID from execute_sql.")

        rows = query_results_cache[result_id]

        # Validate that the specified keys exist in the data
        if rows and len(rows) > 0:
            first_row = rows[0]
            if x_key not in first_row:
                raise ValueError(f"Column '{x_key}' not found in result data. Available columns: {list(first_row.keys())}")
            for y_key in y_keys:
                if y_key not in first_row:
                    raise ValueError(f"Column '{y_key}' not found in result data. Available columns: {list(first_row.keys())}")

        chart_id = str(uuid.uuid4())[:8]
        config = ChartConfig(
            chart_type=chart_type,
            x_key=x_key,
            y_keys=y_keys,
            title=title,
            x_label=x_label,
            y_label=y_label,
        )

        return ChartResult(
            success=True,
            chart_id=chart_id,
            chart_type=chart_type,
            rows=rows,
            config=config,
            error=None,
            explanation=explanation,
        )
    except Exception as e:
        return ChartResult(
            success=False,
            chart_id=str(uuid.uuid4())[:8],
            chart_type=chart_type,
            rows=[],
            config=ChartConfig(
                chart_type=chart_type,
                x_key=x_key,
                y_keys=y_keys,
            ),
            error=str(e),
            explanation=None,
        )


@app.get("/tools-schema")
def tools_schema():
    """
    Export JSON schemas for all tool output types with tool name mapping.

    This endpoint enables automatic type generation on the frontend.
    The frontend script (scripts/generate-types.js) fetches this schema and uses
    json-schema-to-typescript to generate TypeScript type definitions.

    Structure:
    {
        "tools": {
            "tool_name": {
                "output": <JSON Schema of the tool's output Pydantic model>
            }
        }
    }

    To add a new tool:
    1. Define a Pydantic model for the tool's output (e.g., Weather class)
    2. Create a @agent.tool_plain function with that return type (e.g., get_weather)
    3. Add an entry to this endpoint mapping tool name to its output schema
    4. Frontend: Run `npm run generate:types` to regenerate TypeScript types
    5. Frontend: Add renderer to toolRenderers.tsx

    Example:
        @agent.tool_plain
        def my_tool(param: str) -> MyOutput:
            '''Tool description.'''
            return MyOutput(...)

        # In /tools-schema return:
        "my_tool": {
            "output": MyOutput.model_json_schema(),
        }
    """
    return {
        "tools": {
            "execute_sql": {
                "output": SQLQueryResult.model_json_schema(),
            },
            "render_chart": {
                "output": ChartResult.model_json_schema(),
            },
            # Add more tool schemas here as you add new tools
        }
    }


@app.post("/chat")
async def chat(request: Request) -> Response:
    """Streaming chat endpoint using Vercel AI protocol."""
    return await VercelAIAdapter.dispatch_request(request, agent=agent)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
