import { ColDef, GetRowIdFunc } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { CSSProperties, useMemo } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export type GridThemeVariant = 'aurora' | 'midnight' | 'sunset';

interface DataGridTableProps<T extends object> {
  rows: T[];
  columns: ColDef<T>[];
  emptyMessage: string;
  quickFilterText?: string;
  pageSize?: number;
  height?: number;
  pagination?: boolean;
  themeMode?: 'light' | 'dark';
  themeVariant?: GridThemeVariant;
  getRowId?: GetRowIdFunc<T>;
}

export const DataGridTable = <T extends object>({
  rows,
  columns,
  emptyMessage,
  quickFilterText,
  pageSize = 15,
  height = 420,
  pagination = true,
  themeMode = 'light',
  themeVariant = 'aurora',
  getRowId,
}: DataGridTableProps<T>) => {
  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: false,
      suppressHeaderMenuButton: true,
      minWidth: 110,
    }),
    [],
  );

  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  const shouldPaginate = pagination && rows.length > pageSize;
  const gridStyle = useMemo(
    () =>
      ({
        height,
        '--ag-font-family': "'Manrope', sans-serif",
        '--ag-background-color': 'var(--grid-bg)',
        '--ag-foreground-color': 'var(--ink)',
        '--ag-header-foreground-color': 'var(--ink-soft)',
        '--ag-header-background-color': 'var(--grid-header)',
        '--ag-border-color': 'var(--grid-border)',
        '--ag-row-border-color': 'color-mix(in srgb, var(--grid-border) 75%, transparent)',
        '--ag-selected-row-background-color': 'color-mix(in srgb, var(--primary) 16%, transparent)',
        '--ag-odd-row-background-color': 'color-mix(in srgb, var(--grid-bg) 92%, var(--panel))',
        '--ag-control-panel-background-color': 'var(--grid-bg)',
        '--ag-input-focus-border-color': 'var(--primary)',
        '--ag-range-selection-border-color': 'var(--primary)',
      }) as CSSProperties,
    [height, themeMode, themeVariant]
  );

  return (
      <div
        className={`ag-grid-shell grid-skin-${themeVariant} ag-theme-quartz ${
        themeMode === 'dark' ? 'ag-theme-quartz-dark' : ''
       }`}
        style={{ height }}
      >
      <AgGridReact<T>
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        animateRows
        suppressMovableColumns
        suppressCellFocus
        rowHeight={40}
        headerHeight={44}
        quickFilterText={quickFilterText}
        pagination={shouldPaginate}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={[10, 15, 25, 50]}
        getRowId={getRowId}
      />
    </div>
  );
};
