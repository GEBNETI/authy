import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface LineChartData {
  label: string;
  value: number;
  date?: string;
}

interface LineChartProps {
  data: LineChartData[];
  title?: string;
  height?: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showTrend?: boolean;
  formatValue?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 200,
  color = 'primary',
  showTrend = true,
  formatValue = (value) => value.toString(),
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-base-content/50">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Calculate trend
  const trend = data.length > 1 ? 
    data[data.length - 1].value - data[0].value : 0;
  const trendPercent = data[0].value !== 0 ? 
    ((trend / data[0].value) * 100) : 0;

  // Color classes
  const colorClasses = {
    primary: 'stroke-primary fill-primary/10',
    success: 'stroke-success fill-success/10',
    warning: 'stroke-warning fill-warning/10',
    error: 'stroke-error fill-error/10',
    info: 'stroke-info fill-info/10',
  };

  // Generate SVG path
  const pathData = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - point.value) / range) * 80 + 10;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path (for fill)
  const areaPath = `${pathData} L 100 90 L 0 90 Z`;

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-base-content">{title}</h3>
          {showTrend && (
            <div className="flex items-center space-x-1">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-error" />
              ) : null}
              <span className={`text-sm font-medium ${
                trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-base-content/70'
              }`}>
                {trend > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.1" className="text-base-content/10"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Area fill */}
          <path
            d={areaPath}
            className={colorClasses[color]}
            strokeWidth="0"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            className={colorClasses[color].split(' ')[0]}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = ((maxValue - point.value) / range) * 80 + 10;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                className={`${colorClasses[color].split(' ')[0]} fill-current`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        
        {/* Tooltip areas */}
        <div className="absolute inset-0 flex">
          {data.map((point, index) => (
            <div
              key={index}
              className="flex-1 group relative"
              style={{ cursor: 'pointer' }}
            >
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2 shadow-lg text-sm">
                  <div className="font-medium">{formatValue(point.value)}</div>
                  <div className="text-base-content/70">{point.label}</div>
                  {point.date && (
                    <div className="text-xs text-base-content/50">{point.date}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-base-content/50 px-1">
        <span>{data[0]?.label || ''}</span>
        <span>{data[Math.floor(data.length / 2)]?.label || ''}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
};

export default LineChart;