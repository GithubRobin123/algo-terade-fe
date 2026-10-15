export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TokenRenewalStatus {
  autoRequestEnabled: boolean;
  scheduledTimeIst: string;
  state: 'IDLE' | 'AWAITING_APPROVAL' | 'FAILED';
  lastRequestAt: string | null;
  approvalExpiresAt: string | null;
  attemptsToday: number;
  maxAttemptsPerDay: number;
  lastTrigger: string | null;
  lastError: string | null;
}

export interface AuthStatus {
  connected: boolean;
  expired?: boolean;
  expiresAt: string | null;
  tokenType: string | null;
  scope: string | null;
  source?: 'database' | 'env' | 'none';
  renewal?: TokenRenewalStatus;
}

export interface UnderlyingInstrument {
  symbol: string;
  displayName: string;
  instrumentKey: string;
  optionChainInstrumentKey: string;
  defaultLotSize: number;
  assetClass: 'INDEX' | 'COMMODITY' | 'STOCK';
  supportsOptions: boolean;
  intradayAllowed: boolean;
}

export interface MarketTick {
  symbol: string;
  instrumentKey: string;
  ltp: number;
  sourceTimestamp: string;
}

export interface OptionChainRow {
  strikePrice: number;
  callLtp: number | null;
  callOi: number | null;
  putLtp: number | null;
  putOi: number | null;
  iv: number | null;
  callInstrumentKey: string | null;
  putInstrumentKey: string | null;
}

export interface OptionChain {
  symbol: string;
  instrumentKey: string;
  underlyingPrice: number | null;
  expiryDate: string | null;
  snapshotTime: string;
  rows: OptionChainRow[];
}

export interface TradeOrder {
  id: number;
  provider: string;
  providerOrderId: string | null;
  side: 'BUY' | 'SELL';
  symbol: string;
  instrumentKey: string;
  quantity: number;
  product: string;
  orderType: string;
  validity: string;
  price: number | null;
  triggerPrice: number | null;
  status: string;
  isPaper: boolean;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TradeIntent {
  id: number;
  source: 'MANUAL' | 'STRATEGY';
  status:
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXECUTED'
    | 'FAILED'
    | 'EXPIRED';
  side: 'BUY' | 'SELL';
  symbol: string;
  instrumentKey: string;
  quantity: number;
  orderType: string;
  product: string;
  validity: string;
  price: number | null;
  triggerPrice: number | null;
  tag: string | null;
  confidence: number | null;
  rationale: string | null;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  expiresAt: string | null;
  executedOrderId: number | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StrategyPosition {
  id: number;
  symbol: string;
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number | null;
  stopLossPrice: number;
  targetPrice: number;
  trailActive: boolean;
  bestPrice: number;
  status: 'OPEN' | 'CLOSED';
  openedOrderId: number | null;
  closedOrderId: number | null;
  exitReason: string | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StrategyStatus {
  enabled: boolean;
  activeUnderlying: string;
  risk: {
    tradeCountToday: number;
    dailyPnl: number;
    dailyLossLimit: number;
    blocked: boolean;
    blockReason: string | null;
  };
  openPositions: number;
  pendingIntents: number;
}

export interface StockCatalogItem {
  id: number;
  instrumentKey: string;
  symbol: string;
  tradingSymbol: string;
  displayName: string;
  exchange: string | null;
  segment: string | null;
  assetClass: string | null;
  instrumentType: string | null;
  expiryDate: string | null;
  strikePrice: number | null;
  optionType: string | null;
  lotSize: number | null;
  tickSize: number | null;
  isTradable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  instrumentKey: string;
  displayName: string;
  exchange: string | null;
  segment: string | null;
  notes: string | null;
  lastPrice: number | null;
  closePrice: number | null;
  change: number | null;
  changePct: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  connected: boolean;
  profile: {
    userId: string | null;
    email: string | null;
    userName: string | null;
    broker: string | null;
  } | null;
  wallet: {
    equity: {
      availableMargin: number | null;
      usedMargin: number | null;
      payin: number | null;
      span: number | null;
      exposure: number | null;
      adhoc: number | null;
      notionalCash: number | null;
    };
    commodity: {
      availableMargin: number | null;
      usedMargin: number | null;
      payin: number | null;
      span: number | null;
      exposure: number | null;
      adhoc: number | null;
      notionalCash: number | null;
    };
  } | null;
  holdings: Array<{
    instrumentKey: string;
    tradingSymbol: string;
    exchange: string | null;
    quantity: number;
    averagePrice: number | null;
    lastPrice: number | null;
    pnl: number | null;
    product: string | null;
  }>;
  positions: Array<{
    instrumentKey: string;
    tradingSymbol: string;
    exchange: string | null;
    quantity: number;
    averagePrice: number | null;
    lastPrice: number | null;
    pnl: number | null;
    product: string | null;
  }>;
  mtfPositions: Array<{
    instrumentKey: string;
    tradingSymbol: string;
    exchange: string | null;
    quantity: number;
    averagePrice: number | null;
    lastPrice: number | null;
    pnl: number | null;
    product: string | null;
  }>;
  refreshedAt: string;
}

export interface OrderCheckResult {
  allowed: boolean;
  side: 'BUY' | 'SELL';
  estimatedPrice: number;
  estimatedOrderValue: number;
  availableToTrade: number | null;
  reason: string | null;
  warnings: string[];
}

export interface ReportSummary {
  rangeDays: number;
  generatedAt: string;
  orders: {
    total: number;
    buyCount: number;
    sellCount: number;
    failedCount: number;
    paperCount: number;
    liveCount: number;
    estimatedNotional: number;
  };
  strategy: {
    closedPositions: number;
    openPositions: number;
    realizedPnl: number;
    unrealizedPnl: number;
    winRatePct: number;
  };
}

export interface DailyReportRow {
  day: string;
  orderCount: number;
  failedOrders: number;
  estimatedNotional: number;
  realizedPnl: number;
}

export interface PlaceOrderInput {
  symbol: string;
  instrumentKey: string;
  quantity: number;
  orderType?: string;
  product?: string;
  validity?: string;
  price?: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  tag?: string;
}

export interface PlaceIntentInput {
  source?: 'MANUAL' | 'STRATEGY';
  side: 'BUY' | 'SELL';
  symbol: string;
  instrumentKey: string;
  quantity: number;
  orderType?: string;
  product?: string;
  validity?: string;
  price?: number;
  triggerPrice?: number;
  tag?: string;
  confidence?: number;
  rationale?: string;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
  expiresInMinutes?: number;
}

export interface SocketEnvelope<T> {
  event: string;
  data: T;
  ts: string;
}

export interface MarketOverviewResponse {
  data: MarketOverviewItem[];
  marketOpen: boolean;
  cachedAt?: string;
}

// Market overview tile — one per underlying instrument
export interface MarketOverviewItem {
  symbol: string;
  displayName: string;
  instrumentKey: string;
  assetClass: 'INDEX' | 'COMMODITY' | 'STOCK';
  supportsOptions: boolean;
  defaultLotSize: number;
  ltp: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
}

// Pushed by backend execution engine every 5s for each open position
export interface TradeHistoryEntry {
  id: number;
  openedAt: string;
  closedAt: string | null;
  strategy: string | null;
  optionType: string | null;
  strikePrice: number | null;
  symbol: string;
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLossPrice: number;
  targetPrice: number;
  exitReason: string | null;
  realizedPnl: number | null;
  pnlPct: number | null;
  confidence: number | null;
  rationale: string | null;
  status: 'OPEN' | 'CLOSED';
  trailActive: boolean;
  bestPrice: number;
  indexPriceAtEntry: number | null;
  ruleSignals: string[] | null;
  decisionLogId: number | null;
}

export interface DecisionLogEntry {
  id: number;
  timestamp: string;
  underlying: string;
  indexPrice: number | null;
  decision: 'ACCEPTED' | 'REJECTED' | 'FAILED';
  rejectionCategory: string | null;
  rejectionReason: string | null;
  strategy: string | null;
  optionType: string | null;
  strikePrice: number | null;
  entryPremium: number | null;
  stopLossPrice: number | null;
  targetPrice: number | null;
  confidence: number | null;
  rationale: string | null;
  latencyMs: number | null;
  tradeOfDay: number | null;
}

export interface TradeSummaryStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalRealizedPnl: number;
  avgWin: number;
  avgLoss: number;
  strategyBreakdown: Record<string, { trades: number; pnl: number; wins: number }>;
  exitReasonBreakdown: Record<string, number>;
  decisionBreakdown: Record<string, number>;
}

export interface PositionUpdate {
  id: number;
  symbol: string;
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLossPrice: number;
  targetPrice: number;
  trailActive: boolean;
  bestPrice: number;
  status: string;
}
