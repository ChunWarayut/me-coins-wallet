# 🔄 คู่มือใช้งานระบบชำระเงินแบบ Callback

## 📋 ภาพรวม

ระบบชำระเงินส่วนกลางที่รองรับการ **Callback** กลับไปยังระบบต้นทาง หลังจากชำระเงินเสร็จสิ้น

### Flow การทำงาน

```
1. ระบบของคุณ → POST /payments/intents (พร้อม callbackUrl และ cancelUrl)
2. API ตอบกลับ → { paymentUrl: "http://your-domain/payment/pi_xxxxx" }
3. Redirect ผู้ใช้ไป → paymentUrl (หน้าชำระเงินส่วนกลาง)
4. ผู้ใช้สแกน QR และชำระเงิน
5. ระบบตรวจจับสถานะ "succeeded"
6. Redirect กลับไป → callbackUrl?payment_id=xxx&status=success&amount=10000
```

---

## 🚀 การใช้งาน

### 1. สร้าง Payment Intent พร้อม Callback URLs

```bash
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "email": "customer@example.com",
    "description": "สั่งซื้อสินค้า Order #12345",
    "callbackUrl": "https://your-site.com/payment/success",
    "cancelUrl": "https://your-site.com/payment/cancel",
    "metadata": {
      "orderId": "12345",
      "userId": "user_abc"
    }
  }'
```

**Response:**

```json
{
  "paymentIntentId": "pi_3xxxxxxxxxxxxxx",
  "status": "requires_action",
  "amount": 10000,
  "currency": "thb",
  "paymentUrl": "http://localhost:3000/payment/pi_3xxxxxxxxxxxxxx",
  "qr": {
    "imageUrl": "https://qr.stripe.com/...png"
  }
}
```

### 2. Redirect ผู้ใช้ไปหน้าชำระเงิน

```javascript
// ระบบของคุณ
const response = await fetch('http://localhost:3000/payments/intents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 10000,
    email: 'customer@example.com',
    description: 'Order #12345',
    callbackUrl: 'https://your-site.com/payment/success',
    cancelUrl: 'https://your-site.com/payment/cancel',
  })
});

const data = await response.json();

// Redirect ผู้ใช้ไปหน้าชำระเงิน
window.location.href = data.paymentUrl;
```

### 3. รับ Callback หลังชำระเงินสำเร็จ

หน้า **success callback** ของคุณจะได้รับ query parameters:

```
https://your-site.com/payment/success?payment_id=pi_3xxx&status=success&amount=10000
```

**ตัวอย่างการจัดการ Callback:**

```javascript
// ที่หน้า https://your-site.com/payment/success
const urlParams = new URLSearchParams(window.location.search);
const paymentId = urlParams.get('payment_id');
const status = urlParams.get('status');
const amount = urlParams.get('amount');

if (status === 'success') {
  // ยืนยันกับ backend ของคุณ
  await fetch('https://your-site.com/api/confirm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, amount })
  });
  
  // แสดงหน้าสำเร็จ
  alert('ชำระเงินสำเร็จ!');
}
```

---

## 📊 Callback Parameters

### Success Callback (`callbackUrl`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `payment_id` | string | Payment Intent ID | `pi_3xxxxxxxxxxxxxx` |
| `status` | string | สถานะการชำระเงิน | `success` |
| `amount` | number | จำนวนเงิน (สตางค์) | `10000` |
| `signature` | string | HMAC-SHA256(`payment_id:amount`) ด้วย `CALLBACK_SIGNATURE_SECRET` | `e8c72a...` |

### Cancel Callback (`cancelUrl`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `payment_id` | string | Payment Intent ID | `pi_3xxxxxxxxxxxxxx` |
| `status` | string | สถานะ | `cancel` |
| `amount` | number | จำนวนเงิน (สตางค์) | `10000` |
| `signature` | string | HMAC-SHA256(`payment_id:amount`) ด้วย `CALLBACK_SIGNATURE_SECRET` | `e8c72a...` |

> ⚙️ ตั้งค่า `CALLBACK_SIGNATURE_SECRET` ใน `.env` ของบริการนี้ก่อน เพื่อให้ระบบสร้างลายเซ็นให้ทุกครั้งที่เรียก `GET /payments/:id`

### ตรวจสอบลายเซ็นบนระบบของคุณ

ตัวอย่าง Node.js/Express สำหรับตรวจสอบลายเซ็น:

```ts
import { createHmac } from 'crypto';
import type { Request, Response } from 'express';

const CALLBACK_SIGNATURE_SECRET = process.env.CALLBACK_SIGNATURE_SECRET!;

export const handlePaymentCallback = (req: Request, res: Response) => {
  const { payment_id, status, amount, signature } = req.query;

  if (!payment_id || !amount || !signature) {
    return res.status(400).send('missing parameters');
  }

  const expected = createHmac('sha256', CALLBACK_SIGNATURE_SECRET)
    .update(`${payment_id}:${amount}`)
    .digest('hex');

  if (expected !== signature) {
    return res.status(403).send('invalid signature');
  }

  // ผ่านการตรวจสอบแล้ว: ไปยืนยันกับ backend/Stripe ต่อ
  return res.send('ok');
};
```

---

## 💻 ตัวอย่างการใช้งานแบบเต็ม

### Frontend (React/Next.js)

```typescript
// components/PaymentButton.tsx
import { useState } from 'react';

export default function PaymentButton({ orderId, amount }) {
  const [loading, setLoading] = useState(false);
  
  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // สร้าง Payment Intent
      const response = await fetch('http://localhost:3000/payments/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount * 100, // แปลงเป็นสตางค์
          email: 'customer@example.com',
          description: `Order #${orderId}`,
          callbackUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
          metadata: {
            orderId: orderId.toString(),
          }
        })
      });
      
      const data = await response.json();
      
      // Redirect ไปหน้าชำระเงิน
      window.location.href = data.paymentUrl;
      
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาด');
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'กำลังโหลด...' : 'ชำระเงิน'}
    </button>
  );
}
```

### Success Page

```typescript
// pages/payment/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentSuccess() {
  const router = useRouter();
  const { payment_id, status, amount } = router.query;
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    if (payment_id && status === 'success') {
      verifyPayment();
    }
  }, [payment_id]);
  
  const verifyPayment = async () => {
    try {
      // ยืนยันการชำระเงินกับ backend ของคุณ
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment_id,
          amount: parseInt(amount as string)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVerified(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div>
      <h1>✅ ชำระเงินสำเร็จ!</h1>
      <p>Payment ID: {payment_id}</p>
      <p>จำนวนเงิน: {(parseInt(amount as string) / 100).toFixed(2)} THB</p>
      {verified && <p>การชำระเงินได้รับการยืนยันแล้ว</p>}
    </div>
  );
}
```

### Backend Verification (Node.js/Express)

```typescript
// routes/api/verify-payment.ts
import express from 'express';

const router = express.Router();

router.post('/verify-payment', async (req, res) => {
  const { paymentId, amount } = req.body;
  
  try {
    // ตรวจสอบกับระบบชำระเงิน
    const response = await fetch(`http://localhost:3000/payments/${paymentId}`);
    const payment = await response.json();
    
    // ตรวจสอบสถานะและจำนวนเงิน
    if (payment.status === 'succeeded' && payment.amount === amount) {
      // บันทึกลงฐานข้อมูล
      await db.orders.update({
        where: { paymentIntentId: paymentId },
        data: { status: 'PAID', paidAt: new Date() }
      });
      
      res.json({ success: true, message: 'Payment verified' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
```

---

## 🔐 Security Best Practices

### 1. ✅ ยืนยันการชำระเงินฝั่ง Server

**อย่าเชื่อ** query parameters จาก callback URL เพียงอย่างเดียว!

```typescript
// ❌ อันตราย
if (urlParams.get('status') === 'success') {
  markOrderAsPaid(); // อาจถูกปลอมแปลงได้!
}

// ✅ ถูกต้อง
const paymentId = urlParams.get('payment_id');

// ยืนยันกับ API
const payment = await fetch(`http://localhost:3000/payments/${paymentId}`);
const data = await payment.json();

if (data.status === 'succeeded') {
  markOrderAsPaid(); // ปลอดภัย
}
```

### 2. ✅ ใช้ Webhook เป็นหลัก

Callback URL เหมาะสำหรับ **UX เท่านั้น** ควรใช้ **Webhook** เป็นหลักในการยืนยัน:

```typescript
// Webhook handler
app.post('/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.rawBody,
    req.headers['stripe-signature'],
    webhookSecret
  );
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // อัปเดตสถานะใน database
    await updateOrderStatus(paymentIntent.id, 'PAID');
  }
  
  res.json({ received: true });
});
```

### 3. ✅ Validate Callback URLs

ตรวจสอบว่า callback URLs เป็น domains ที่อนุญาต:

```typescript
const ALLOWED_DOMAINS = ['https://your-site.com', 'https://your-site.co.th'];

function isValidCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => url.startsWith(domain));
  } catch {
    return false;
  }
}
```

---

## 🧪 การทดสอบ

### Local Development

```bash
# 1. รันเซิร์ฟเวอร์
npm run start:dev

# 2. สร้าง Payment Intent
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "email": "test@example.com",
    "callbackUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel"
  }'

# 3. เปิด paymentUrl ที่ได้ในเบราว์เซอร์
open "http://localhost:3000/payment/pi_xxxxx"
```

### ทดสอบ Callback

```bash
# จำลอง success callback
open "http://localhost:3001/success?payment_id=pi_test&status=success&amount=100"

# จำลอง cancel callback
open "http://localhost:3001/cancel?payment_id=pi_test&status=cancel"
```

---

## ⚙️ Environment Variables

เพิ่มในไฟล์ `.env`:

```env
# Base URL สำหรับสร้าง payment URL
BASE_URL=http://localhost:3000

# หรือใน production
BASE_URL=https://your-payment-api.com
```

---

## 📚 API Reference

### POST /payments/intents

**สร้าง Payment Intent พร้อม Callback URLs**

**Request:**
```json
{
  "amount": 10000,
  "email": "customer@example.com",
  "description": "Order #12345",
  "callbackUrl": "https://your-site.com/success",
  "cancelUrl": "https://your-site.com/cancel",
  "metadata": {
    "orderId": "12345"
  }
}
```

**Response:**
```json
{
  "paymentIntentId": "pi_xxxxx",
  "paymentUrl": "http://localhost:3000/payment/pi_xxxxx",
  "amount": 10000,
  "currency": "thb",
  "status": "requires_action",
  "qr": {
    "imageUrl": "https://qr.stripe.com/...png"
  }
}
```

### GET /payment/:id

**หน้าชำระเงินส่วนกลาง**

แสดงหน้า UI พร้อม QR Code สำหรับชำระเงิน

---

## ✅ Checklist

- [ ] เพิ่ม `callbackUrl` และ `cancelUrl` ใน request
- [ ] Redirect ผู้ใช้ไป `paymentUrl` ที่ได้รับ
- [ ] สร้างหน้า success และ cancel callback
- [ ] ยืนยันการชำระเงินฝั่ง server ก่อนอนุมัติ
- [ ] ใช้ Webhook เป็นหลักในการอัปเดตสถานะ
- [ ] Validate callback URLs
- [ ] ทดสอบทั้ง success และ cancel flow

---

## 🎉 พร้อมใช้งาน!

ระบบชำระเงินแบบ Callback พร้อมใช้งานแล้ว สามารถ integrate กับระบบใดก็ได้ที่สามารถเรียก REST API และรับ redirect callback!
