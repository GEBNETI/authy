import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './Button';

interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
    onChange: (column: string, direction: 'asc' | 'desc') => void;
  };
  rowKey?: keyof T | string | ((record: T, index: number) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  pagination,
  sorting,
  rowKey = 'id',
  onRowClick,
  className = '',
  striped = true,
  hoverable = true,
}: TableProps<T>) => {
  const getValue = (record: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], record);
    }
    return record[key as keyof T];
  };

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record, index);
    }
    return String(getValue(record, rowKey) || index);
  };

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || !sorting) return;

    const newDirection = 
      sorting.column === column.key && sorting.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    sorting.onChange(String(column.key), newDirection);
  };

  const renderSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable || !sorting) return null;

    const isActive = sorting.column === column.key;
    const IconComponent = 
      isActive && sorting.direction === 'asc' ? ChevronUp : ChevronDown;

    return (
      <IconComponent 
        className={`w-4 h-4 ml-1 transition-colors ${
          isActive ? 'text-primary' : 'text-base-content/40'
        }`}
      />
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { current, pageSize, total, onChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-base-300">
        <div className="text-sm text-base-content/70">
          Showing {startItem} to {endItem} of {total} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 1}
            onClick={() => onChange(current - 1, pageSize)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              const distance = Math.abs(page - current);
              return distance <= 2 || page === 1 || page === totalPages;
            })
            .map((page, index, arr) => (
              <React.Fragment key={page}>
                {index > 0 && arr[index - 1] !== page - 1 && (
                  <span className="px-2 text-base-content/40">...</span>
                )}
                <Button
                  variant={current === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onChange(page, pageSize)}
                >
                  {page}
                </Button>
              </React.Fragment>
            ))}
          
          <Button
            variant="outline"
            size="sm"
            disabled={current === totalPages}
            onClick={() => onChange(current + 1, pageSize)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`card bg-base-100 shadow-md ${className}`}>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="border-b border-base-300">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-sm font-medium text-base-content/70 ${
                    column.width ? `w-${column.width}` : ''
                  } ${column.sortable ? 'cursor-pointer hover:bg-base-200' : ''} ${
                    column.className || ''
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <div className="loading loading-spinner loading-lg text-primary"></div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <div className="text-base-content/50">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={`border-b border-base-300/50 ${
                    striped && index % 2 === 1 ? 'bg-base-200/30' : ''
                  } ${hoverable ? 'hover:bg-base-200/50' : ''} ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(record, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-3 text-sm text-base-content ${
                        column.className || ''
                      }`}
                    >
                      {column.render
                        ? column.render(getValue(record, column.key), record, index)
                        : String(getValue(record, column.key) || '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
};

export default Table;