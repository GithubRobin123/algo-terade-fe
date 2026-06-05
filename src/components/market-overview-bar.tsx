import { MarketOverviewItem } from '../api/types';

interface MarketOverviewBarProps {
  items: MarketOverviewItem[];
  selectedSymbol: string;
  onSelect: (item: MarketOverviewItem) => void;
  themeMode?: 'light' | 'dark';
}

const fmt = (n: number | null, decimals = 2): string =>
  n == null ? '--' : n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtPrice = (n: number | null): string =>
  n == null ? '--' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MarketOverviewBar = ({
  items,
  selectedSymbol,
  onSelect,
  themeMode = 'light',
}: MarketOverviewBarProps) => {
  const isDark = themeMode === 'dark';

  return (
    <div className="market-overview-bar">
      {items.map((item) => {
        const isSelected = item.symbol === selectedSymbol;
        const isUp = item.change != null && item.change >= 0;
        const changeColor = item.change == null
          ? (isDark ? '#93a2bf' : '#5d708e')
          : isUp
          ? (isDark ? '#3bc58b' : '#11875d')
          : (isDark ? '#ff6c62' : '#c53b2c');

        return (
          <button
            key={item.symbol}
            className={`mkt-tile ${isSelected ? 'mkt-tile-active' : ''}`}
            onClick={() => onSelect(item)}
            title={`${item.displayName} — Click to view option chain`}
          >
            <div className="mkt-tile-name">{item.displayName}</div>

            <div className="mkt-tile-price">
              {fmtPrice(item.ltp)}
            </div>

            <div className="mkt-tile-change" style={{ color: changeColor }}>
              {item.change != null ? (
                <>
                  <span>{isUp ? '▲' : '▼'}</span>
                  {' '}
                  {fmt(Math.abs(item.change))}
                  {' '}
                  <span className="mkt-tile-pct">
                    ({isUp ? '+' : '-'}{fmt(Math.abs(item.changePct ?? 0))}%)
                  </span>
                </>
              ) : (
                <span style={{ opacity: 0.4 }}>--</span>
              )}
            </div>

            <div className="mkt-tile-meta">
              <span className={`mkt-tile-badge ${item.supportsOptions ? 'badge-options' : 'badge-view'}`}>
                {item.supportsOptions ? 'Options' : 'View'}
              </span>
              <span className="mkt-tile-lot">Lot: {item.defaultLotSize}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
