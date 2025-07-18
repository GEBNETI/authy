import { useState, useCallback } from 'react';

interface UseFiltersOptions<T> {
  initialFilters?: T;
  onFilterChange?: (filters: T) => void;
}

interface UseFiltersReturn<T> {
  filters: T;
  setFilter: (key: keyof T, value: T[keyof T]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export const useFilters = <T extends Record<string, any>>(
  options: UseFiltersOptions<T> = {}
): UseFiltersReturn<T> => {
  const { initialFilters = {} as T, onFilterChange } = options;
  
  const [filters, setFiltersState] = useState<T>(initialFilters);

  const setFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    const newFilters = { ...filters, [key]: value };
    setFiltersState(newFilters);
    onFilterChange?.(newFilters);
  }, [filters, onFilterChange]);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  const clearFilters = useCallback(() => {
    setFiltersState(initialFilters);
    onFilterChange?.(initialFilters);
  }, [initialFilters, onFilterChange]);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
  };
};

export default useFilters;