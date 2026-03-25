import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { TradeOrder } from '../api/types';
import { formatDateTime, formatPrice } from '../lib/format';
import { DataGridTable } from './data-grid-table';

interface OrderListProps {
  orders: TradeOrder[];
  themeMode?: 'light' | 'dark';
}

export const OrderList = ({ orders, themeMode = 'light' }: OrderListProps) => {
  const columns = useMemo<ColDef<TradeOrder>[]>(
    () => [
      {
        headerName: 'Time',
        field: 'createdAt',
        minWidth: 210,
        valueFormatter: (params) => formatDateTime(params.value as string | null),
      },
      {
        headerName: 'Side',
        field: 'side',
        cellClass: (params) => (params.value === 'BUY' ? 'side-buy' : 'side-sell'),
      },
      { headerName: 'Symbol', field: 'symbol', minWidth: 130 },
      { headerName: 'Qty', field: 'quantity', minWidth: 90 },
      {
        headerName: 'Price',
        field: 'price',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      { headerName: 'Status', field: 'status', minWidth: 120 },
      {
        headerName: 'Mode',
        valueGetter: (params) => (params.data?.isPaper ? 'Paper' : 'Live'),
        minWidth: 110,
      },
    ],
    [],
  );

  if (!orders.length) {
    return <div className="empty-state">No orders yet.</div>;
  }

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>Recent Orders</h3>
        <span>{orders.length} entries</span>
      </div>

      <DataGridTable<TradeOrder>
        rows={orders}
        columns={columns}
        emptyMessage="No orders yet."
        themeMode={themeMode}
        height={420}
        pageSize={12}
        getRowId={(params) => `${params.data.id}`}
      />
    </div>
  );
};
