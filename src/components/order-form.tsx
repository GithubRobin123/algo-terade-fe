import { FormEvent, useEffect, useState } from 'react';
import { PlaceOrderInput } from '../api/types';

interface OrderFormProps {
  defaultSymbol: string;
  defaultInstrumentKey: string;
  defaultQuantity?: number;
  onSubmit: (side: 'BUY' | 'SELL', payload: PlaceOrderInput) => Promise<void>;
  disabled?: boolean;
}

export const OrderForm = ({
  defaultSymbol,
  defaultInstrumentKey,
  defaultQuantity = 1,
  onSubmit,
  disabled = false,
}: OrderFormProps) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [instrumentKey, setInstrumentKey] = useState(defaultInstrumentKey);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [price, setPrice] = useState('');
  const [product, setProduct] = useState('I');
  const [validity, setValidity] = useState('DAY');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [tag, setTag] = useState('dashboard');
  const [submittingSide, setSubmittingSide] = useState<'BUY' | 'SELL' | null>(null);

  useEffect(() => {
    setInstrumentKey(defaultInstrumentKey);
  }, [defaultInstrumentKey]);

  useEffect(() => {
    setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  useEffect(() => {
    setQuantity(defaultQuantity);
  }, [defaultQuantity]);

  const buildPayload = (): PlaceOrderInput => {
    const payload: PlaceOrderInput = {
      symbol,
      instrumentKey,
      quantity,
      orderType,
      product,
      validity,
      tag,
    };

    if (price && orderType === 'LIMIT') {
      payload.price = Number(price);
    }

    if (triggerPrice) {
      payload.triggerPrice = Number(triggerPrice);
    }

    return payload;
  };

  const submitOrder = async (event: FormEvent<HTMLButtonElement>, side: 'BUY' | 'SELL') => {
    event.preventDefault();
    setSubmittingSide(side);

    try {
      await onSubmit(side, buildPayload());
    } finally {
      setSubmittingSide(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>Place Order</h3>
        <span>Buy / Sell via backend API</span>
      </div>

      <form className="order-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Symbol
          <input value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={disabled} />
        </label>

        <label>
          Instrument Key
          <input
            value={instrumentKey}
            onChange={(event) => setInstrumentKey(event.target.value)}
            disabled={disabled}
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            disabled={disabled}
          />
        </label>

        <label>
          Order Type
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as 'MARKET' | 'LIMIT')}
            disabled={disabled}
          >
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
          </select>
        </label>

        <label>
          Limit Price
          <input
            type="number"
            min={0}
            step="0.05"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={disabled || orderType !== 'LIMIT'}
            placeholder="Required for LIMIT"
          />
        </label>

        <label>
          Trigger Price
          <input
            type="number"
            min={0}
            step="0.05"
            value={triggerPrice}
            onChange={(event) => setTriggerPrice(event.target.value)}
            disabled={disabled}
            placeholder="Optional"
          />
        </label>

        <label>
          Product
          <select value={product} onChange={(event) => setProduct(event.target.value)} disabled={disabled}>
            <option value="I">I (Intraday)</option>
            <option value="D">D (Delivery)</option>
            <option value="MTF">MTF</option>
          </select>
        </label>

        <label>
          Validity
          <select value={validity} onChange={(event) => setValidity(event.target.value)} disabled={disabled}>
            <option value="DAY">DAY</option>
            <option value="IOC">IOC</option>
          </select>
        </label>

        <label>
          Tag
          <input value={tag} onChange={(event) => setTag(event.target.value)} disabled={disabled} />
        </label>

        <div className="order-actions">
          <button
            type="button"
            className="btn btn-buy"
            onClick={(event) => {
              void submitOrder(event, 'BUY');
            }}
            disabled={disabled || submittingSide !== null}
          >
            {submittingSide === 'BUY' ? 'Submitting...' : 'Buy'}
          </button>

          <button
            type="button"
            className="btn btn-sell"
            onClick={(event) => {
              void submitOrder(event, 'SELL');
            }}
            disabled={disabled || submittingSide !== null}
          >
            {submittingSide === 'SELL' ? 'Submitting...' : 'Sell'}
          </button>
        </div>
      </form>
    </div>
  );
};
