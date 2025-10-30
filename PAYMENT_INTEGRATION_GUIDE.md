# คู่มือการเชื่อมต่อระบบชำระเงิน PromptPay ผ่าน Stripe

## 📋 สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [ข้อกำหนดเบื้องต้น](#ข้อกำหนดเบื้องต้น)
3. [การตั้งค่า](#การตั้งค่า)
4. [API Endpoints](#api-endpoints)
5. [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)
6. [การทดสอบ](#การทดสอบ)
7. [Security Best Practices](#security-best-practices)

---

## ภาพรวม

ระบบชำระเงินนี้รองรับการชำระเงินผ่าน **PromptPay** โดยใช้ Stripe Payment Intents API  
ระบบจะสร้าง QR Code PromptPay ให้ผู้ใช้สแกนชำระเงิน และแจ้งสถานะผ่าน Webhook

### Flow การทำงาน

```
1. ระบบของคุณ -> POST /payments/intents (สร้าง Payment Intent)
2. API ตอบกลับ -> { paymentIntentId, qr: { imageUrl } }
3. แสดง QR Code ให้ลูกค้า
4. ลูกค้าสแกน QR และชำระเงินผ่านแอปธนาคาร
5. Stripe -> POST /payments/webhook (แจ้งสถานะ)
6. (Optional) โพลสถานะด้วย GET /payments/:id
```

---

## ข้อกำหนดเบื้องต้น

- **Node.js** >= 16.x
- **Stripe Account** พร้อม Secret Key
- **Stripe CLI** สำหรับทดสอบ Webhook (local development)
- บัญชี Stripe ต้องเปิดใช้งาน PromptPay (ต้องยืนยันบัญชีธุรกิจในประเทศไทย)

---

## การตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
npm install stripe
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` หรือเพิ่มค่าเหล่านี้:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_stripe_cli
```

### 3. รันเซิร์ฟเวอร์

```bash
npm run start
```

เซิร์ฟเวอร์จะทำงานที่ `http://localhost:3000`

### 4. ตั้งค่า Webhook (สำหรับ Local Development)

```bash
# ติดตั้ง Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/payments/webhook

# คัดลอกค่า webhook signing secret ที่แสดงและใส่ใน .env
```

---

## API Endpoints

### 1. สร้าง Payment Intent

**POST** `/payments/intents`

สร้างรายการชำระเงินใหม่และรับ QR Code PromptPay

#### Request Body

```json
{
  "amount": 10000,
  "currency": "thb",
  "description": "สั่งซื้อสินค้า Order #12345",
  "metadata": {
    "orderId": "12345",
    "userId": "user_abc123",
    "customField": "any-value"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ | จำนวนเงินในหน่วย**สตางค์** (100 = 1 THB) |
| `currency` | string | ❌ | สกุลเงิน (default: `thb`) |
| `description` | string | ❌ | คำอธิบายรายการ |
| `metadata` | object | ❌ | ข้อมูลเพิ่มเติมที่ต้องการเก็บ (key-value pairs) |

#### Response

```json
{
  "paymentIntentId": "pi_3xxxxxxxxxxxxxx",
  "clientSecret": "pi_3xxxxxxxxxxxxxx_secret_xxxx",
  "status": "requires_action",
  "amount": 10000,
  "currency": "thb",
  "qr": {
    "imageUrl": "https://qr.stripe.com/....png",
    "data": "00020101021..."
  }
}
```

| Field | Description |
|-------|-------------|
| `paymentIntentId` | ID ของ Payment Intent (ใช้สำหรับตรวจสอบสถานะ) |
| `clientSecret` | Client Secret (ใช้ในฝั่ง client-side ถ้าต้องการ) |
| `status` | สถานะปัจจุบัน (มักเป็น `requires_action`) |
| `qr.imageUrl` | URL ของ QR Code (PNG/SVG) |
| `qr.data` | ข้อมูล QR Code แบบ raw (EMVCo format) |

---

### 2. ตรวจสอบสถานะการชำระเงิน

**GET** `/payments/:id`

ตรวจสอบสถานะปัจจุบันของ Payment Intent

#### Request

```bash
GET /payments/pi_3xxxxxxxxxxxxxx
```

#### Response

```json
{
  "id": "pi_3xxxxxxxxxxxxxx",
  "status": "succeeded",
  "amount": 10000,
  "currency": "thb",
  "description": "สั่งซื้อสินค้า Order #12345",
  "metadata": {
    "orderId": "12345",
    "userId": "user_abc123"
  }
}
```

#### สถานะที่เป็นไปได้

| Status | Description |
|--------|-------------|
| `requires_action` | รอลูกค้าสแกน QR และชำระเงิน |
| `requires_confirmation` | รอการยืนยัน |
| `processing` | กำลังประมวลผล |
| `succeeded` | ✅ ชำระเงินสำเร็จ |
| `canceled` | ❌ ยกเลิกแล้ว |
| `requires_payment_method` | ล้มเหลว ต้องชำระใหม่ |

---

### 3. Webhook Endpoint (สำหรับรับการแจ้งเตือน)

**POST** `/payments/webhook`

Stripe จะส่ง event มายัง endpoint นี้เมื่อสถานะการชำระเงินเปลี่ยนแปลง

#### Headers

```
stripe-signature: t=1234567890,v1=xxxxx,v0=xxxxx
```

#### Events ที่รองรับ

- `payment_intent.succeeded` - ชำระเงินสำเร็จ
- `payment_intent.payment_failed` - ชำระเงินล้มเหลว
- `payment_intent.canceled` - ยกเลิกการชำระเงิน

#### Response

```json
{
  "received": true
}
```

---

## ตัวอย่างการใช้งาน

### 1. cURL

#### สร้าง Payment Intent

```bash
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "thb",
    "description": "ทดสอบชำระเงิน",
    "metadata": {
      "orderId": "TEST001"
    }
  }'
```

#### ตรวจสอบสถานะ

```bash
curl http://localhost:3000/payments/pi_3xxxxxxxxxxxxxx
```

---

### 2. JavaScript/TypeScript (Node.js)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function createPayment() {
  try {
    const response = await axios.post(`${API_BASE_URL}/payments/intents`, {
      amount: 10000, // 100.00 THB
      currency: 'thb',
      description: 'สั่งซื้อสินค้า #12345',
      metadata: {
        orderId: '12345',
        userId: 'user_abc',
      }
    });
    
    const { paymentIntentId, qr } = response.data;
    
    console.log('Payment Intent ID:', paymentIntentId);
    console.log('QR Code URL:', qr.imageUrl);
    
    // แสดง QR Code ให้ลูกค้า
    return { paymentIntentId, qrUrl: qr.imageUrl };
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

async function checkPaymentStatus(paymentIntentId: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/payments/${paymentIntentId}`);
    console.log('Status:', response.data.status);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// การใช้งาน
(async () => {
  const payment = await createPayment();
  
  // โพลสถานะทุก 3 วินาที
  const pollInterval = setInterval(async () => {
    const status = await checkPaymentStatus(payment.paymentIntentId);
    
    if (status.status === 'succeeded') {
      console.log('✅ ชำระเงินสำเร็จ!');
      clearInterval(pollInterval);
    } else if (['canceled', 'requires_payment_method'].includes(status.status)) {
      console.log('❌ การชำระเงินล้มเหลว');
      clearInterval(pollInterval);
    }
  }, 3000);
})();
```

---

### 3. Python

```python
import requests
import time

API_BASE_URL = 'http://localhost:3000'

def create_payment():
    response = requests.post(
        f'{API_BASE_URL}/payments/intents',
        json={
            'amount': 10000,  # 100.00 THB
            'currency': 'thb',
            'description': 'สั่งซื้อสินค้า #12345',
            'metadata': {
                'orderId': '12345',
                'userId': 'user_abc'
            }
        }
    )
    response.raise_for_status()
    return response.json()

def check_payment_status(payment_intent_id):
    response = requests.get(f'{API_BASE_URL}/payments/{payment_intent_id}')
    response.raise_for_status()
    return response.json()

# การใช้งาน
payment = create_payment()
payment_id = payment['paymentIntentId']
qr_url = payment['qr']['imageUrl']

print(f'Payment Intent ID: {payment_id}')
print(f'QR Code URL: {qr_url}')

# โพลสถานะ
while True:
    status = check_payment_status(payment_id)
    print(f'Current status: {status["status"]}')
    
    if status['status'] == 'succeeded':
        print('✅ ชำระเงินสำเร็จ!')
        break
    elif status['status'] in ['canceled', 'requires_payment_method']:
        print('❌ การชำระเงินล้มเหลว')
        break
    
    time.sleep(3)
```

---

### 4. PHP

```php
<?php

$apiBaseUrl = 'http://localhost:3000';

function createPayment($apiBaseUrl) {
    $data = [
        'amount' => 10000, // 100.00 THB
        'currency' => 'thb',
        'description' => 'สั่งซื้อสินค้า #12345',
        'metadata' => [
            'orderId' => '12345',
            'userId' => 'user_abc'
        ]
    ];
    
    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents("$apiBaseUrl/payments/intents", false, $context);
    
    return json_decode($result, true);
}

function checkPaymentStatus($apiBaseUrl, $paymentIntentId) {
    $result = file_get_contents("$apiBaseUrl/payments/$paymentIntentId");
    return json_decode($result, true);
}

// การใช้งาน
$payment = createPayment($apiBaseUrl);
$paymentId = $payment['paymentIntentId'];
$qrUrl = $payment['qr']['imageUrl'];

echo "Payment Intent ID: $paymentId\n";
echo "QR Code URL: $qrUrl\n";

// โพลสถานะ
while (true) {
    $status = checkPaymentStatus($apiBaseUrl, $paymentId);
    echo "Current status: {$status['status']}\n";
    
    if ($status['status'] === 'succeeded') {
        echo "✅ ชำระเงินสำเร็จ!\n";
        break;
    } elseif (in_array($status['status'], ['canceled', 'requires_payment_method'])) {
        echo "❌ การชำระเงินล้มเหลว\n";
        break;
    }
    
    sleep(3);
}
?>
```

---

## การทดสอบ

### 1. ทดสอบด้วย Stripe CLI

```bash
# รัน webhook listener
stripe listen --forward-to localhost:3000/payments/webhook

# ในเทอร์มินัลอื่น สร้าง Payment Intent
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "description": "Test Payment"}'

# จำลอง event ชำระเงินสำเร็จ
stripe trigger payment_intent.succeeded
```

### 2. ทดสอบด้วยหน้าเว็บตัวอย่าง

เปิดไฟล์ `public/payment-example.html` ในเบราว์เซอร์:

```bash
open public/payment-example.html
```

หรือเข้าผ่าน static server:

```bash
npx serve public
# เปิด http://localhost:3000/payment-example.html
```

### 3. Test Mode vs Live Mode

- **Test Mode**: ใช้ `sk_test_...` - ไม่มีการชำระเงินจริง
- **Live Mode**: ใช้ `sk_live_...` - มีการชำระเงินจริง

**⚠️ คำเตือน**: PromptPay อาจไม่สามารถทดสอบใน Test Mode ได้เต็มรูปแบบ อาจต้องใช้บัญชี Live และทำธุรกรรมจริง (แล้ว refund)

---

## Security Best Practices

### 1. ✅ ตรวจสอบจำนวนเงินฝั่ง Server เสมอ

```typescript
// ❌ อันตราย - เชื่อข้อมูลจาก client
const amount = req.body.amount; // อาจถูกแก้ไขได้!

// ✅ ถูกต้อง - ดึงข้อมูลจากฐานข้อมูล
const order = await db.orders.findOne({ id: orderId });
const amount = order.totalAmount;
```

### 2. ✅ ใช้ Metadata เก็บข้อมูลสำคัญ

```typescript
{
  amount: calculatedAmount,
  metadata: {
    orderId: order.id,
    userId: user.id,
    expectedAmount: calculatedAmount.toString()
  }
}
```

### 3. ✅ ตรวจสอบ Webhook Signature ทุกครั้ง

ระบบจะตรวจสอบ signature อัตโนมัติ แต่ต้องแน่ใจว่าตั้งค่า `STRIPE_WEBHOOK_SECRET` ถูกต้อง

### 4. ✅ จัดการ Idempotency

หาก webhook ถูกส่งซ้ำ ต้องป้องกันการประมวลผลซ้ำ:

```typescript
// ตัวอย่าง
if (order.paymentStatus === 'paid') {
  return; // ป้องกันการประมวลผลซ้ำ
}
```

### 5. ✅ ตั้งค่า CORS อย่างเหมาะสม

```typescript
app.enableCors({
  origin: ['https://yourdomain.com'], // ระบุ domain ที่อนุญาต
  credentials: true
});
```

### 6. ✅ Rate Limiting

```bash
npm install @nestjs/throttler
```

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10, // สูงสุด 10 requests ต่อนาที
    }),
  ],
})
```

### 7. ✅ Logging

Log ทุก transaction สำหรับ audit trail:

```typescript
this.logger.log(`Payment created: ${paymentIntentId}, amount: ${amount}`);
this.logger.log(`Payment succeeded: ${paymentIntentId}`);
```

---

## FAQ

### Q: จำนวนเงินขั้นต่ำคือเท่าไร?

**A**: Stripe PromptPay รองรับตั้งแต่ 1 บาท (100 สตางค์) แต่อาจมีข้อจำกัดตามธนาคาร

### Q: QR Code มีอายุกี่นาที?

**A**: โดยปกติ Payment Intent จะหมดอายุใน **24 ชั่วโมง** แต่แนะนำให้กำหนด timeout เอง (เช่น 15-30 นาที)

### Q: รองรับสกุลเงินอื่นไหม?

**A**: PromptPay รองรับเฉพาะ **THB** เท่านั้น

### Q: ต้องมี SSL/HTTPS ไหม?

**A**: สำหรับ production **ต้องมี HTTPS** (Stripe Webhook ต้องการ)  
สำหรับ local development ใช้ `stripe listen` ได้

### Q: ถ้า webhook ไม่ทำงานล่ะ?

**A**: ใช้วิธีโพลสถานะด้วย `GET /payments/:id` เป็น fallback

---

## ติดต่อและสนับสนุน

หากมีปัญหาหรือข้อสงสัย:

1. ตรวจสอบ logs ที่ console/terminal
2. ดูเอกสาร [Stripe Docs](https://stripe.com/docs)
3. ทดสอบด้วย `stripe listen` เพื่อดู event ที่เกิดขึ้น

---

## License

MIT License - ใช้งานได้อย่างอิสระ

