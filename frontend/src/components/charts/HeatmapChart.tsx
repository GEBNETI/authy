import React from 'react';

interface HeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  width?: number;
  height?: number;
  xLabels?: string[];
  yLabels?: string[];
  colorScheme?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title,
  width = 400,
  height = 200,
  xLabels = [],
  yLabels = [],
  colorScheme = 'primary',
  showValues = false,
  formatValue = (value) => value.toString(),
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-base-content/50">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const maxX = Math.max(...data.map(d => d.x));
  const maxY = Math.max(...data.map(d => d.y));
  
  const cellWidth = width / (maxX + 1);
  const cellHeight = height / (maxY + 1);

  // Color scheme
  const getColorIntensity = (value: number) => {
    const intensity = (value - minValue) / range;
    const schemes = {
      primary: `rgba(59, 130, 246, ${intensity})`,
      success: `rgba(16, 185, 129, ${intensity})`,
      warning: `rgba(245, 158, 11, ${intensity})`,
      error: `rgba(239, 68, 68, ${intensity})`,
      info: `rgba(6, 182, 212, ${intensity})`,
    };
    return schemes[colorScheme];
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="font-medium text-base-content">{title}</h3>
      )}
      
      <div className="inline-block relative">
        {/* Y-axis labels */}
        {yLabels.length > 0 && (
          <div className="absolute -left-16 top-0 h-full flex flex-col justify-between text-xs text-base-content/70">
            {yLabels.map((label, index) => (
              <div key={index} className="flex items-center h-8">
                {label}
              </div>
            ))}
          </div>
        )}
        
        {/* Heatmap grid */}
        <div className="relative bg-base-200 rounded-lg overflow-hidden" style={{ width, height }}>
          <svg width={width} height={height} className="absolute inset-0">
            {data.map((cell, index) => {
              const x = cell.x * cellWidth;
              const y = cell.y * cellHeight;
              
              return (
                <g key={index}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellWidth - 2}
                    height={cellHeight - 2}
                    fill={getColorIntensity(cell.value)}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-base-content/10 hover:stroke-base-content/30 transition-colors"
                    rx="2"
                  />
                  
                  {showValues && (
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-base-content/90 font-medium"
                      style={{ fontSize: Math.min(cellWidth, cellHeight) / 4 }}
                    >
                      {formatValue(cell.value)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Hover tooltips */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${maxX + 1}, 1fr)`, gridTemplateRows: `repeat(${maxY + 1}, 1fr)` }}>
            {data.map((cell, index) => (
              <div
                key={index}
                className="group relative cursor-pointer"
                style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2 shadow-lg text-sm whitespace-nowrap">
                    <div className="font-medium">{formatValue(cell.value)}</div>
                    {cell.label && (
                      <div className="text-base-content/70">{cell.label}</div>
                    )}
                    <div className="text-xs text-base-content/50">
                      Position: ({cell.x}, {cell.y})
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis labels */}
        {xLabels.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-base-content/70 px-2">
            {xLabels.map((label, index) => (
              <div key={index} className="text-center" style={{ width: cellWidth }}>
                {label}
              </div>
            ))}
          </div>
        )}
        
        {/* Color scale legend */}
        <div className="flex items-center justify-center mt-4 space-x-2">
          <span className="text-xs text-base-content/70">Low</span>
          <div className="flex space-x-1">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
              <div
                key={index}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getColorIntensity(minValue + intensity * range) }}
              />
            ))}
          </div>
          <span className="text-xs text-base-content/70">High</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;