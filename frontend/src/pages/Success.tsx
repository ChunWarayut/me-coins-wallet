import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Success.css';

export default function Success() {
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
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <div className="status-badge">✓ ชำระเงินสำเร็จ</div>

        <h1>ขอบคุณสำหรับการชำระเงิน!</h1>
        <p className="subtitle">รายการของคุณได้รับการชำระเงินเรียบร้อยแล้ว</p>

        <div className="details">
          <div className="detail-row">
            <span className="label">Payment ID:</span>
            <span className="value">{paymentId || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="label">สถานะ:</span>
            <span className="value">{status === 'success' ? 'ชำระเงินสำเร็จ' : status || '-'}</span>
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

        <Link to="/" className="btn">กลับไปหน้าหลัก</Link>

        <div className="info-box">
          <h3>💡 นี่คือหน้า Demo Callback</h3>
          <p>
            หน้านี้แสดงตัวอย่างการ redirect กลับมายังระบบต้นทาง หลังจากชำระเงินสำเร็จ
            <br /><br />
            ในระบบจริง คุณสามารถใช้ <strong>callbackUrl</strong> เพื่อ redirect กลับไปยังหน้าใดก็ได้ของระบบคุณ
            พร้อมกับ query parameters: <code>payment_id</code>, <code>status</code>, และ <code>amount</code>
          </p>
        </div>
      </div>
    </div>
  );
}

