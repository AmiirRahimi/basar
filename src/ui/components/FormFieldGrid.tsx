import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const DEFAULT_COLUMNS = 2;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;

const GRID_COL_CLASSES: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

export type FormFieldGridItem = {
  name: string;
};

export function normalizeColumnsPerRow(
  configured?: number,
  defaultColumns = DEFAULT_COLUMNS,
  allowSingleColumn = false
): number {
  const value = configured ?? defaultColumns;
  const minColumns = allowSingleColumn ? 1 : MIN_COLUMNS;
  return Math.min(Math.max(minColumns, value), MAX_COLUMNS);
}

export function chunkFormFields<T>(items: T[], columnsPerRow: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columnsPerRow) {
    rows.push(items.slice(index, index + columnsPerRow));
  }
  return rows;
}

export function getActiveRowColumns(
  rowFieldCount: number,
  columnsPerRow: number,
  allowSingleColumn = false
): number {
  const normalizedColumns = normalizeColumnsPerRow(
    columnsPerRow,
    DEFAULT_COLUMNS,
    allowSingleColumn
  );
  if (rowFieldCount <= 0) return normalizedColumns;
  return rowFieldCount < normalizedColumns ? rowFieldCount : normalizedColumns;
}

export type FormFieldGridProps<T extends FormFieldGridItem = FormFieldGridItem> = {
  fields: T[];
  columnsPerRow: number;
  renderField: (field: T) => ReactNode;
  allowSingleColumn?: boolean;
  className?: string;
};

export function FormFieldGrid<T extends FormFieldGridItem = FormFieldGridItem>({
  fields,
  columnsPerRow,
  renderField,
  allowSingleColumn = false,
  className,
}: FormFieldGridProps<T>) {
  if (fields.length === 0) return null;

  const normalizedColumns = normalizeColumnsPerRow(
    columnsPerRow,
    DEFAULT_COLUMNS,
    allowSingleColumn
  );
  const rows = chunkFormFields(fields, normalizedColumns);

  return (
    <div className={cn('mt-4 flex flex-col gap-4', className)}>
      {rows.map((rowFields, rowIndex) => {
        const activeColumns = getActiveRowColumns(
          rowFields.length,
          normalizedColumns,
          allowSingleColumn
        );
        const gridClass = GRID_COL_CLASSES[activeColumns] ?? GRID_COL_CLASSES[DEFAULT_COLUMNS];

        return (
          <div
            key={`form-row-${rowIndex}-${rowFields.map((field) => field.name).join('-')}`}
            className={cn('grid grid-cols-1 gap-x-6 gap-y-5', gridClass)}
          >
            {rowFields.map((field) => (
              <div key={field.name} className="min-w-0 w-full">
                {renderField(field)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
