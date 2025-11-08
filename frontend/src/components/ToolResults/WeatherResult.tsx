import type { ToolOutputTypes } from '../../types/tools';
import './ToolResults.css';

interface WeatherResultProps {
  data: ToolOutputTypes['get_weather'];
}

export function WeatherResult({ data }: WeatherResultProps) {
  return (
    <div className="tool-result weather">
      <div className="tool-result-header">🌤️ Weather for {data.city}</div>
      <div className="tool-result-content">
        <p><strong>Condition:</strong> {data.condition}</p>
        <p><strong>Temperature:</strong> {data.temperature}°{data.unit}</p>
      </div>
    </div>
  );
}
