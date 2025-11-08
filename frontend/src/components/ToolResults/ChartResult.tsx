import type { ToolOutputTypes } from '../../types/tools';
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  ComposedChart,
  RadarChart,
  RadialBarChart,
  FunnelChart,
  Treemap,
  Sankey,
  Line,
  Bar,
  Pie,
  Area,
  Scatter,
  Radar,
  RadialBar,
  Funnel,
  XAxis,
  YAxis,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import './ToolResults.css';

interface ChartResultProps {
  data: ToolOutputTypes['render_chart'];
}

// Colors for pie charts and multiple series
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
];

export function ChartResult({ data }: ChartResultProps) {
  if (!data.success) {
    return (
      <div className="tool-result chart-error">
        <div className="tool-result-header">❌ Chart Rendering Error</div>
        <div className="tool-result-content">
          <p className="error-message">{data.error}</p>
        </div>
      </div>
    );
  }

  const { rows, config } = data;

  if (!rows || rows.length === 0) {
    return (
      <div className="tool-result chart-empty">
        <div className="tool-result-header">📊 Chart</div>
        <div className="tool-result-content">
          <p className="no-results">No data available to render chart</p>
        </div>
      </div>
    );
  }

  const chartTitle = config.title || `${config.chart_type} Chart`;

  return (
    <div className="tool-result chart-result">
      <div className="tool-result-header">📊 {chartTitle}</div>
      <div className="tool-result-content chart-content">
        <ResponsiveContainer width="100%" height={400}>
          {renderChart(config.chart_type, rows, config.x_key, config.y_keys)}
        </ResponsiveContainer>
        {data.explanation && (
          <div className="chart-explanation">
            {data.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

function renderChart(
  type: string,
  data: Array<Record<string, unknown>>,
  xKey: string,
  yKeys: string[]
): React.ReactNode {
  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 0, bottom: 5 },
  };

  switch (type.toLowerCase()) {
    case 'line':
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[idx % COLORS.length]}
              dot={false}
            />
          ))}
        </LineChart>
      );

    case 'bar':
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
            />
          ))}
        </BarChart>
      );

    case 'area':
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, idx) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
              stroke={COLORS[idx % COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      );

    case 'scatter':
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, idx) => (
            <Scatter
              key={key}
              name={key}
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
            />
          ))}
        </ScatterChart>
      );

    case 'composed':
      return (
        <ComposedChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, idx) => {
            // Alternate between line and bar for visual variety
            if (idx % 2 === 0) {
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  dot={false}
                />
              );
            } else {
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[idx % COLORS.length]}
                />
              );
            }
          })}
        </ComposedChart>
      );

    case 'pie':
      // For pie charts, use the first y_key
      const pieKey = yKeys[0];
      return (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={data}
            dataKey={pieKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );

    case 'radar':
      return (
        <RadarChart {...commonProps}>
          <PolarGrid />
          <PolarAngleAxis dataKey={xKey} />
          <PolarRadiusAxis />
          <Radar name={yKeys[0]} dataKey={yKeys[0]} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
          <Tooltip />
          <Legend />
        </RadarChart>
      );

    case 'radial_bar':
      return (
        <RadialBarChart {...commonProps} innerRadius="10%" outerRadius="90%">
          <PolarAngleAxis type="number" dataKey={xKey} />
          <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
          <RadialBar
            label={{ position: 'insideStart', fill: '#fff' }}
            background
            dataKey={yKeys[0]}
            fill={COLORS[0]}
          />
          <Tooltip />
          <Legend />
        </RadialBarChart>
      );

    case 'funnel':
      return (
        <FunnelChart {...commonProps}>
          <Tooltip />
          <Legend />
          <Funnel
            dataKey={yKeys[0]}
            data={data}
            isAnimationActive
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      );

    case 'treemap':
      return (
        <Treemap
          width={700}
          height={400}
          data={data}
          dataKey={yKeys[0]}
          stroke="#fff"
          fill={COLORS[0]}
        >
          <Tooltip />
        </Treemap>
      );

    case 'sankey':
      // Sankey requires specific data structure, attempt to use the data as-is
      return (
        <Sankey
          width={700}
          height={400}
          data={{
            nodes: data.map((item: any) => ({ name: item[xKey] })),
            links: data.map((item: any, idx: number) => ({
              source: idx,
              target: (idx + 1) % data.length,
              value: item[yKeys[0]],
            })),
          }}
          node={{ fill: COLORS[0], fillOpacity: 1 }}
          link={{ stroke: COLORS[0], strokeOpacity: 0.3 }}
          nodePadding={50}
        >
          <Tooltip />
        </Sankey>
      );

    default:
      return <div className="chart-error">Unsupported chart type: {type}</div>;
  }
}
