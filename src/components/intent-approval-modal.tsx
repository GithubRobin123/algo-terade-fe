import { TradeIntent } from '../api/types';
import { formatPrice } from '../lib/format';

interface IntentApprovalModalProps {
  intent: TradeIntent | null;
  busy?: boolean;
  onApprove: (intent: TradeIntent) => Promise<void>;
  onReject: (intent: TradeIntent) => Promise<void>;
  onClose: () => void;
}

export const IntentApprovalModal = ({
  intent,
  busy = false,
  onApprove,
  onReject,
  onClose,
}: IntentApprovalModalProps) => {
  if (!intent) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3>Trade Approval Required</h3>
        <p className="modal-subtitle">
          Source: {intent.source} | Confidence: {intent.confidence !== null ? intent.confidence.toFixed(2) : '--'}
        </p>
        <p>
          <strong>{intent.side}</strong> {intent.quantity} of <strong>{intent.symbol}</strong>
        </p>
        <p>Instrument: {intent.instrumentKey}</p>
        <p>Order Type: {intent.orderType}</p>
        <p>Price: {formatPrice(intent.price)}</p>
        {intent.rationale ? <p>Rationale: {intent.rationale}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Later
          </button>
          <button
            className="btn btn-sell"
            onClick={() => {
              void onReject(intent);
            }}
            disabled={busy}
          >
            Reject
          </button>
          <button
            className="btn btn-buy"
            onClick={() => {
              void onApprove(intent);
            }}
            disabled={busy}
          >
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
};
