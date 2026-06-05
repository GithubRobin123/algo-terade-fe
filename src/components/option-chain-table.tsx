import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OptionChain, OptionChainRow } from '../api/types';
import { formatNumber, formatPrice, formatTime } from '../lib/format';

export interface SelectedOption {
  instrumentKey: string;
  label: string;
  strikePrice: number;
  type: 'CE' | 'PE';
}

interface OptionChainTableProps {
  chain: OptionChain | null;
  spotPrice?: number | null;
  themeMode?: 'light' | 'dark';
  onSelectOption?: (option: SelectedOption) => void;
}

const findAtmStrike = (rows: OptionChainRow[], price: number): number =>
  rows.reduce(
    (best, row) =>
      Math.abs(row.strikePrice - price) < Math.abs(best - price) ? row.strikePrice : best,
    rows[0].strikePrice,
  );

export const OptionChainTable = ({
  chain,
  spotPrice,
  themeMode = 'light',
  onSelectOption,
}: OptionChainTableProps) => {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const atmRowRef = useRef<HTMLTableRowElement | null>(null);
  const prevAtmRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const isDark = themeMode === 'dark';

  const atmStrike = useMemo(() => {
    if (spotPrice == null || !chain?.rows.length) return null;
    return findAtmStrike(chain.rows, spotPrice);
  }, [spotPrice, chain?.rows]);

  // Scroll ATM row into view when it changes
  useEffect(() => {
    if (atmStrike === prevAtmRef.current) return;
    prevAtmRef.current = atmStrike;
    forceRender((n) => n + 1);
    setTimeout(() => {
      atmRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  }, [atmStrike]);

  const handleCeClick = useCallback(
    (row: OptionChainRow) => {
      if (!row.callInstrumentKey || !onSelectOption) return;
      onSelectOption({ instrumentKey: row.callInstrumentKey, label: `${row.strikePrice} CE`, strikePrice: row.strikePrice, type: 'CE' });
    },
    [onSelectOption],
  );

  const handlePeClick = useCallback(
    (row: OptionChainRow) => {
      if (!row.putInstrumentKey || !onSelectOption) return;
      onSelectOption({ instrumentKey: row.putInstrumentKey, label: `${row.strikePrice} PE`, strikePrice: row.strikePrice, type: 'PE' });
    },
    [onSelectOption],
  );

  if (!chain || chain.rows.length === 0) {
    return <div className="empty-state">Option chain data is not available yet.</div>;
  }

  const liveSpot = spotPrice ?? chain.underlyingPrice;

  const css = {
    wrap: {
      overflowX: 'auto' as const,
      overflowY: 'auto' as const,
      maxHeight: 520,
      borderRadius: 10,
      border: `1px solid ${isDark ? '#29415f' : '#d8e2f2'}`,
    } as CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: 13,
      fontFamily: "'Manrope', sans-serif",
    } as CSSProperties,
    thead: {
      position: 'sticky' as const,
      top: 0,
      zIndex: 2,
    } as CSSProperties,
    th: (align: 'left' | 'center' | 'right' = 'right') => ({
      padding: '10px 12px',
      fontWeight: 700,
      fontSize: 12,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: isDark ? '#1f3150' : '#edf2fb',
      color: isDark ? '#93a2bf' : '#5d708e',
      textAlign: align,
      borderBottom: `1px solid ${isDark ? '#29415f' : '#d8e2f2'}`,
      whiteSpace: 'nowrap' as const,
    }),
    callTh: () => ({
      ...css.th('right'),
      color: isDark ? '#3bc58b' : '#11875d',
    }),
    putTh: () => ({
      ...css.th('left'),
      color: isDark ? '#ff6c62' : '#c53b2c',
    }),
    rowBase: {
      borderBottom: `1px solid ${isDark ? '#1d3048' : '#edf2f7'}`,
    } as CSSProperties,
    rowAtm: {
      borderTop: `1.5px solid rgba(245,158,11,0.55)`,
      borderBottom: `1.5px solid rgba(245,158,11,0.55)`,
      background: 'rgba(245,158,11,0.13)',
    } as CSSProperties,
    td: (align: 'left' | 'center' | 'right' = 'right') => ({
      padding: '9px 12px',
      textAlign: align,
      color: isDark ? '#e8edf9' : '#11243d',
      background: 'transparent',
    } as CSSProperties),
    callTd: () => ({
      ...css.td('right'),
      cursor: 'pointer',
    }),
    putTd: () => ({
      ...css.td('left'),
      cursor: 'pointer',
    }),
    strikeTd: {
      padding: '9px 12px',
      textAlign: 'center' as const,
      fontWeight: 700,
      color: isDark ? '#e8edf9' : '#11243d',
      background: 'transparent',
    } as CSSProperties,
    atmStrikeTd: {
      padding: '9px 12px',
      textAlign: 'center' as const,
      fontWeight: 800,
      color: '#f59e0b',
      background: 'transparent',
    } as CSSProperties,
    muted: {
      color: isDark ? '#4a6080' : '#b0bec5',
    } as CSSProperties,
  };

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>{chain.symbol} Option Chain</h3>
        <span className="option-chain-meta">
          Expiry: {chain.expiryDate ?? '--'}&nbsp;|&nbsp;Spot:{' '}
          <strong className="spot-price-label">{formatPrice(liveSpot)}</strong>
          {atmStrike != null && (
            <>&nbsp;|&nbsp;ATM: <strong className="atm-label">{formatNumber(atmStrike)}</strong></>
          )}
          &nbsp;|&nbsp;Snapshot: {formatTime(chain.snapshotTime)}
        </span>
      </div>

      <div style={css.wrap}>
        <table style={css.table}>
          <thead style={css.thead}>
            <tr>
              <th style={css.callTh()}>Call LTP</th>
              <th style={css.callTh()}>Call OI</th>
              <th style={css.th('center')}>IV %</th>
              <th style={css.th('center')}>Strike</th>
              <th style={css.putTh()}>Put LTP</th>
              <th style={css.putTh()}>Put OI</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {chain.rows.map((row) => {
              const isAtm = row.strikePrice === atmStrike;
              const rowStyle = isAtm ? { ...css.rowBase, ...css.rowAtm } : css.rowBase;
              return (
                <tr
                  key={row.strikePrice}
                  ref={isAtm ? (el) => { atmRowRef.current = el; } : undefined}
                  style={rowStyle}
                >
                  {/* Call LTP */}
                  <td
                    style={css.callTd()}
                    title={row.callInstrumentKey ? 'Click to view chart' : undefined}
                    onClick={() => handleCeClick(row)}
                  >
                    {row.callLtp != null ? (
                      <span style={{ color: isDark ? '#3bc58b' : '#11875d', fontWeight: 600 }}>
                        {formatPrice(row.callLtp)}
                        {row.callInstrumentKey && <span style={{ opacity: 0.5, marginLeft: 3, fontSize: 10 }}>↗</span>}
                      </span>
                    ) : <span style={css.muted}>--</span>}
                  </td>

                  {/* Call OI */}
                  <td style={css.td('right')}>
                    {row.callOi != null
                      ? <span style={{ color: isDark ? '#93a2bf' : '#5d708e' }}>{formatNumber(row.callOi)}</span>
                      : <span style={css.muted}>--</span>}
                  </td>

                  {/* IV % */}
                  <td style={css.td('center')}>
                    {row.iv != null
                      ? <span style={{ color: isDark ? '#c8ccd8' : '#444' }}>{row.iv.toFixed(2)}</span>
                      : <span style={css.muted}>--</span>}
                  </td>

                  {/* Strike */}
                  <td style={isAtm ? css.atmStrikeTd : css.strikeTd}>
                    {isAtm && <span className="atm-badge">ATM</span>}{' '}
                    {formatNumber(row.strikePrice)}
                  </td>

                  {/* Put LTP */}
                  <td
                    style={css.putTd()}
                    title={row.putInstrumentKey ? 'Click to view chart' : undefined}
                    onClick={() => handlePeClick(row)}
                  >
                    {row.putLtp != null ? (
                      <span style={{ color: isDark ? '#ff6c62' : '#c53b2c', fontWeight: 600 }}>
                        {formatPrice(row.putLtp)}
                        {row.putInstrumentKey && <span style={{ opacity: 0.5, marginLeft: 3, fontSize: 10 }}>↘</span>}
                      </span>
                    ) : <span style={css.muted}>--</span>}
                  </td>

                  {/* Put OI */}
                  <td style={css.td('left')}>
                    {row.putOi != null
                      ? <span style={{ color: isDark ? '#93a2bf' : '#5d708e' }}>{formatNumber(row.putOi)}</span>
                      : <span style={css.muted}>--</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
