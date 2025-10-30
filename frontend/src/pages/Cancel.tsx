import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Cancel.css';

export default function Cancel() {
  const [searchParams] = useSearchParams();
  const [timestamp, setTimestamp] = useState('');

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');

  useEffect(() => {
    setTimestamp(new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <div className="cancel-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        <div className="status-badge">✕ ยกเลิกการชำระเงิน</div>

        <h1>การชำระเงินถูกยกเลิก</h1>
        <p className="subtitle">คุณสามารถลองชำระเงินใหม่อีกครั้งได้</p>

        <div className="details">
          <div className="detail-row">
            <span className="label">Payment ID:</span>
            <span className="value">{paymentId || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="label">สถานะ:</span>
            <span className="value">{status || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="label">จำนวนเงิน:</span>
            <span className="value amount">
              {amount ? (parseFloat(amount) / 100).toFixed(2) : '-'} THB
            </span>
          </div>
          <div className="detail-row">
            <span className="label">เวลา:</span>
            <span className="value">{timestamp}</span>
          </div>
        </div>

        <Link to="/" className="btn">ลองชำระเงินอีกครั้ง</Link>
      </div>
    </div>
  );
}

