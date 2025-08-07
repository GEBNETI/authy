import React from 'react';

interface DonutChartData {
  label: string;
  value: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

interface DonutChartProps {
  data: DonutChartData[];
  title?: string;
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  showCenter?: boolean;
  centerText?: string;
  formatValue?: (value: number) => string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  size = 200,
  thickness = 20,
  showLegend = true,
  showCenter = true,
  centerText,
  formatValue = (value) => value.toString(),
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: size }}>
        <p className="text-base-content/50">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = (size - thickness) / 2;
  
  // Color classes
  const getColorClass = (color: string = 'primary') => {
    const colorMap = {
      primary: '#3b82f6',
      success: '#10b981', 
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      neutral: '#6b7280',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.primary;
  };

  // Calculate segments
  let currentAngle = -90; // Start at top
  const segments = data.map((item) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (item.value / total) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    // Calculate arc path
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage,
      color: getColorClass(item.color),
    };
  });

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="font-medium text-base-content text-center">{title}</h3>
      )}
      
      <div className="flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform rotate-0">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={thickness}
              className="text-base-200"
            />
            
            {/* Segments */}
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${segment.percentage * 2.51} ${251 - segment.percentage * 2.51}`}
                strokeDashoffset={251 - segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0) * 2.51}
                className="transition-all duration-500 ease-out"
                style={{
                  transformOrigin: `${center}px ${center}px`,
                }}
              />
            ))}
          </svg>
          
          {/* Center content */}
          {showCenter && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-base-content">
                {centerText || total.toLocaleString()}
              </div>
              <div className="text-sm text-base-content/70">Total</div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        {showLegend && (
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="text-sm">
                  <div className="text-base-content">{segment.label}</div>
                  <div className="text-base-content/70">
                    {formatValue(segment.value)} ({segment.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonutChart;