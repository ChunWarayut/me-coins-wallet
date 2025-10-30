import { useState } from 'react';
import { createPayment } from '../api/payments';
import './Home.css';

export default function Home() {
  const [amount, setAmount] = useState(10);
  const [email, setEmail] = useState('humansaees0@gmail.com');
  const [description, setDescription] = useState('Demo Payment from React');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount < 1) {
      setError('จำนวนเงินต้องมากกว่า 1 บาท');
      return;
    }

    if (!email.includes('@')) {
      setError('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await createPayment({
        amount: Math.round(amount * 100),
        email,
        description,
        callbackUrl: `${location.origin}/success`,
        cancelUrl: `${location.origin}/cancel`,
        metadata: { source: 'react-demo' }
      });

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>💳 Demo React PromptPay</h1>
        <p className="subtitle">ทดสอบระบบชำระเงินแบบ Centralized UI</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="amount">จำนวนเงิน (THB)</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              min="1"
              step="1"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">อีเมล (สำหรับ PromptPay)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">รายละเอียด</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '⏳ กำลังสร้าง Payment...' : '🚀 ชำระเงินทันที'}
          </button>
        </form>

        <div className="info-box">
          <h3>💡 ขั้นตอนการทำงาน</h3>
          <ol>
            <li>กดปุ่ม "ชำระเงินทันที" → สร้าง PaymentIntent</li>
            <li>Redirect ไปหน้าชำระเงิน → แสดง QR Code</li>
            <li>สแกน QR และจ่ายเงินผ่าน PromptPay</li>
            <li>ระบบ auto-poll สถานะทุก 3 วินาที</li>
            <li>Callback กลับมาหน้า Success พร้อม payment_id</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

