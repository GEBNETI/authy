import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 200,
  horizontal = false,
  showValues = true,
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

  // Color classes
  const getColorClass = (color: string = 'primary') => {
    const colorMap = {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      info: 'bg-info',
      neutral: 'bg-neutral',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.primary;
  };

  if (horizontal) {
    return (
      <div className="space-y-4">
        {title && (
          <h3 className="font-medium text-base-content">{title}</h3>
        )}
        
        <div className="space-y-3" style={{ height }}>
          {data.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-sm text-base-content/70 text-right flex-shrink-0">
                  {item.label}
                </div>
                
                <div className="flex-1 relative">
                  <div className="w-full bg-base-200 rounded-full h-4">
                    <div
                      className={`${getColorClass(item.color)} h-4 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {showValues && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <span className="text-xs font-medium text-base-content/90">
                        {formatValue(item.value)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="font-medium text-base-content">{title}</h3>
      )}
      
      <div className="flex items-end justify-between space-x-2" style={{ height }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              <div className="relative w-full flex flex-col justify-end" style={{ height: height - 40 }}>
                {showValues && (
                  <div className="text-xs font-medium text-center mb-1 text-base-content/90">
                    {formatValue(item.value)}
                  </div>
                )}
                
                <div
                  className={`${getColorClass(item.color)} rounded-t-sm transition-all duration-500 ease-out`}
                  style={{ height: `${percentage}%` }}
                />
              </div>
              
              <div className="text-xs text-base-content/70 text-center w-full truncate">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart;