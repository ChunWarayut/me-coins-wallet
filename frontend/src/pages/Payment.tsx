import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPaymentStatus, Payment as PaymentType } from '../api/payments';
import './Payment.css';

export default function Payment() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadStatus = async () => {
      try {
        const data = await getPaymentStatus(id);
        setPayment(data);
        setLoading(false);

        console.log('[Payment Status]', data.status);

        if (data.status === 'succeeded') {
          redirectToCallback('success', data);
        } else if (['canceled', 'failed'].includes(data.status)) {
          redirectToCallback('cancel', data);
        }
      } catch (error) {
        console.error('Error loading payment:', error);
        setLoading(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const redirectToCallback = (status: string, data: PaymentType) => {
    const callbackUrl = status === 'success'
      ? data.metadata?.callbackUrl
      : data.metadata?.cancelUrl;

    if (callbackUrl) {
      const url = new URL(callbackUrl, window.location.origin);
      url.searchParams.set('payment_id', data.id);
      url.searchParams.set('status', status);
      url.searchParams.set('amount', String(data.amount));
      if (data.callbackSignature) {
        url.searchParams.set('signature', data.callbackSignature);
      }

      console.log('[Redirecting to]', url.toString());
      window.location.href = url.toString();
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">
            <div className="spinner"></div>
            <p>กำลังโหลดข้อมูลการชำระเงิน...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container">
        <div className="card">
          <div className="error-state">
            <h2>❌ ไม่พบข้อมูลการชำระเงิน</h2>
            <p>กรุณาตรวจสอบ Payment ID อีกครั้ง</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>💳 ชำระเงิน</h1>
        <p className="subtitle">ชำระผ่าน PromptPay</p>

        <div className="payment-info">
          <div className="info-row">
            <span className="label">รายการ:</span>
            <span className="value">{payment.description || '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">Payment ID:</span>
            <span className="value code">{payment.id}</span>
          </div>
          <div className="info-row">
            <span className="label">ยอดชำระ:</span>
            <span className="value amount">{(payment.amount / 100).toFixed(2)} THB</span>
          </div>
        </div>

        <div className="qr-section">
          {payment.qrCodeUrl || payment.metadata?.qrCodeUrl ? (
            <>
              <img
                src={payment.qrCodeUrl || payment.metadata?.qrCodeUrl}
                alt="QR Code"
                className="qr-image"
              />
              <p className="qr-hint">📱 สแกน QR Code เพื่อชำระเงินผ่าน PromptPay</p>
            </>
          ) : (
            <div className="qr-placeholder">
              <p>⚠️ QR Code ไม่สามารถแสดงได้</p>
              <small>(กรุณาใช้ Live Mode ของ Stripe)</small>
            </div>
          )}
        </div>

        <div className={`status-badge status-${payment.status}`}>
          {payment.status === 'succeeded' && '✅ ชำระเงินสำเร็จ'}
          {payment.status === 'processing' && '⏳ กำลังประมวลผล'}
          {payment.status === 'requires_action' && '⏳ กำลังรอการชำระเงิน'}
        </div>

        <div className="info-box">
          💡 ระบบจะตรวจสอบสถานะอัตโนมัติทุก 3 วินาที<br />
          เมื่อชำระเงินสำเร็จจะ redirect กลับอัตโนมัติ
        </div>
      </div>
    </div>
  );
}
