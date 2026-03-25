import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { OptionChain, OptionChainRow } from '../api/types';
import { formatNumber, formatPrice, formatTime } from '../lib/format';
import { DataGridTable } from './data-grid-table';

interface OptionChainTableProps {
  chain: OptionChain | null;
  themeMode?: 'light' | 'dark';
}

export const OptionChainTable = ({ chain, themeMode = 'light' }: OptionChainTableProps) => {
  const columns = useMemo<ColDef<OptionChainRow>[]>(
    () => [
      {
        headerName: 'Call LTP',
        field: 'callLtp',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'Call OI',
        field: 'callOi',
        valueFormatter: (params) => formatNumber(params.value as number | null),
      },
      {
        headerName: 'IV',
        field: 'iv',
        valueFormatter: (params) => formatNumber(params.value as number | null),
      },
      {
        headerName: 'Strike',
        field: 'strikePrice',
        cellClass: 'strike-cell',
        valueFormatter: (params) => formatNumber(params.value as number | null),
      },
      {
        headerName: 'Put LTP',
        field: 'putLtp',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'Put OI',
        field: 'putOi',
        valueFormatter: (params) => formatNumber(params.value as number | null),
      },
    ],
    [],
  );

  if (!chain || chain.rows.length === 0) {
    return <div className="empty-state">Option chain data is not available yet.</div>;
  }

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>{chain.symbol} Option Chain</h3>
        <span>
          Expiry: {chain.expiryDate ?? '--'} | Spot: {formatPrice(chain.underlyingPrice)} | Snapshot:{' '}
          {formatTime(chain.snapshotTime)}
        </span>
      </div>

      <DataGridTable<OptionChainRow>
        rows={chain.rows}
        columns={columns}
        emptyMessage="Option chain data is not available yet."
        pagination={false}
        themeMode={themeMode}
        height={520}
        getRowId={(params) => `${params.data.strikePrice}`}
      />
    </div>
  );
};
