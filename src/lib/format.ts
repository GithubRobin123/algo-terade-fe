export const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatTime = (isoTime: string): string => {
  const date = new Date(isoTime);

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export const formatDateTime = (isoTime: string | null): string => {
  if (!isoTime) {
    return '--';
  }

  const date = new Date(isoTime);
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
};

/**
 * Formats a live/open position symbol into a human-readable option label.
 * symbol is stored as "NIFTY-CE" or "NIFTY-PE".
 * metadata.strike holds the ATM strike used at entry (e.g. 24050).
 * Returns "NIFTY 24050 CE", falling back to raw symbol if data is missing.
 */
export const formatOptionLabel = (
  symbol: string,
  metadata?: Record<string, unknown> | null,
): string => {
  const parts = symbol.split('-');
  const underlying = parts[0] ?? symbol;
  const shortType = parts[1] ?? '';
  const strike = metadata ? (metadata['strike'] as number | undefined) : undefined;
  if (strike && shortType) {
    return `${underlying} ${strike} ${shortType}`;
  }
  return symbol;
};

/**
 * Formats a trade history entry option label from separate strikePrice / optionType fields.
 * optionType comes as "CALL" or "PUT" from the decision log.
 * Returns "NIFTY 24050 CE", falling back to raw symbol if data is missing.
 */
export const formatTradeOptionLabel = (
  symbol: string,
  strikePrice?: number | null,
  optionType?: string | null,
): string => {
  const parts = symbol.split('-');
  const underlying = parts[0] ?? symbol;
  if (strikePrice && optionType) {
    const shortType = optionType === 'CALL' ? 'CE' : optionType === 'PUT' ? 'PE' : optionType;
    return `${underlying} ${strikePrice} ${shortType}`;
  }
  return symbol;
};
