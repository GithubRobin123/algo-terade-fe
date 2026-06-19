import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { StrategyPosition } from '../api/types';
import { formatNumber, formatOptionLabel, formatPrice } from '../lib/format';
import { DataGridTable } from './data-grid-table';

interface PositionTableProps {
  positions: StrategyPosition[];
  onClosePosition: (position: StrategyPosition) => Promise<void>;
  busy?: boolean;
  themeMode?: 'light' | 'dark';
}

export const PositionTable = ({
  positions,
  onClosePosition,
  busy = false,
  themeMode = 'light',
}: PositionTableProps) => {
  const columns = useMemo<ColDef<StrategyPosition>[]>(
    () => [
      {
        headerName: 'Option',
        minWidth: 160,
        valueGetter: (params) => {
          if (!params.data) return '';
          const meta = params.data.metadata as Record<string, unknown>;
          return formatOptionLabel(params.data.symbol, meta);
        },
        tooltipValueGetter: (params) => params.data?.instrumentKey ?? '',
      },
      {
        headerName: 'Strike',
        minWidth: 90,
        valueGetter: (params) => {
          if (!params.data) return null;
          const meta = params.data.metadata as Record<string, unknown>;
          return (meta?.['strike'] as number | undefined) ?? null;
        },
        valueFormatter: (params) => params.value != null ? String(params.value) : '—',
      },
      {
        headerName: 'Index @Entry',
        minWidth: 120,
        valueGetter: (params) => {
          if (!params.data) return null;
          const meta = params.data.metadata as Record<string, unknown>;
          return (meta?.['indexLtp'] as number | undefined) ?? null;
        },
        valueFormatter: (params) => params.value != null ? formatPrice(params.value as number) : '—',
      },
      { headerName: 'Qty', field: 'quantity', minWidth: 90 },
      {
        headerName: 'Entry',
        field: 'entryPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'LTP',
        field: 'currentPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'SL',
        field: 'stopLossPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'Target',
        field: 'targetPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'PnL',
        valueGetter: (params) => {
          if (!params.data) {
            return null;
          }

          return params.data.status === 'OPEN' ? params.data.unrealizedPnl : params.data.realizedPnl;
        },
        valueFormatter: (params) => formatNumber(params.value as number | null),
        cellClass: (params) => {
          const value = params.value as number | null;
          if (value === null || value === undefined || Number.isNaN(value)) {
            return '';
          }
          return value >= 0 ? 'side-buy' : 'side-sell';
        },
      },
      { headerName: 'Status', field: 'status', minWidth: 110 },
      {
        headerName: 'Action',
        minWidth: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: StrategyPosition }) => {
          if (!params.data || params.data.status !== 'OPEN') {
            return '--';
          }

          return (
            <button
              className="btn btn-ghost btn-inline"
              disabled={busy}
              onClick={() => {
                void onClosePosition(params.data as StrategyPosition);
              }}
            >
              Close
            </button>
          );
        },
      },
    ],
    [busy, onClosePosition],
  );

  if (!positions.length) {
    return <div className="empty-state">No strategy positions yet.</div>;
  }

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>Strategy Positions</h3>
        <span>{positions.filter((item) => item.status === 'OPEN').length} open</span>
      </div>

      <DataGridTable<StrategyPosition>
        rows={positions}
        columns={columns}
        emptyMessage="No strategy positions yet."
        themeMode={themeMode}
        height={430}
        pageSize={10}
        getRowId={(params) => `${params.data.id}`}
      />
    </div>
  );
};
