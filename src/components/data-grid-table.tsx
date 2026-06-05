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

// Concrete colors per mode — avoids CSS variable cascade conflicts from grid-skin-* classes
const COLORS = {
  dark: {
    bg: '#13233b',
    header: '#1f3150',
    fg: '#e8edf9',
    fgSoft: '#93a2bf',
    border: '#29415f',
    oddRow: '#162035',
    selected: 'rgba(79,141,255,0.16)',
    primary: '#4f8dff',
  },
  light: {
    bg: '#ffffff',
    header: '#edf2fb',
    fg: '#11243d',
    fgSoft: '#5d708e',
    border: '#d8e2f2',
    oddRow: '#f8fafd',
    selected: 'rgba(0,88,216,0.16)',
    primary: '#0058d8',
  },
};

export const DataGridTable = <T extends object>({
  rows,
  columns,
  emptyMessage,
  quickFilterText,
  pageSize = 15,
  height = 420,
  pagination = true,
  themeMode = 'light',
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

  const c = themeMode === 'dark' ? COLORS.dark : COLORS.light;

  const gridStyle = useMemo<CSSProperties>(
    () => ({
      height,
      '--ag-font-family': "'Manrope', sans-serif",
      '--ag-background-color': c.bg,
      '--ag-foreground-color': c.fg,
      '--ag-header-background-color': c.header,
      '--ag-header-foreground-color': c.fgSoft,
      '--ag-border-color': c.border,
      '--ag-row-border-color': c.border,
      '--ag-odd-row-background-color': c.oddRow,
      '--ag-selected-row-background-color': c.selected,
      '--ag-control-panel-background-color': c.bg,
      '--ag-input-focus-border-color': c.primary,
      '--ag-range-selection-border-color': c.primary,
    }) as CSSProperties,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height, themeMode],
  );

  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  const shouldPaginate = pagination && rows.length > pageSize;

  return (
    <div
      className={`ag-grid-shell ${themeMode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}`}
      style={gridStyle}
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
