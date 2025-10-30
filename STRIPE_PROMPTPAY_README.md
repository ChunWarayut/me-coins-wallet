# 🎉 ระบบชำระเงิน Stripe PromptPay - คู่มือเริ่มต้นใช้งาน

## 📖 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การติดตั้งและตั้งค่า](#การติดตั้งและตั้งค่า)
3. [การใช้งานหน้า Frontend (HTML)](#การใช้งานหน้า-frontend-html)
4. [API สำหรับระบบอื่นเชื่อมต่อ](#api-สำหรับระบบอื่นเชื่อมต่อ)
5. [การทดสอบ](#การทดสอบ)
6. [โครงสร้างไฟล์](#โครงสร้างไฟล์)

---

## ภาพรวมระบบ

ระบบนี้เป็นการบูรณาการ **Stripe PromptPay Payment** เข้ากับ NestJS Backend ของคุณ รองรับ:

✅ สร้าง Payment Intent และ QR Code PromptPay  
✅ ตรวจสอบสถานะการชำระเงิน (Polling)  
✅ รับ Webhook จาก Stripe เมื่อสถานะเปลี่ยนแปลง  
✅ บันทึกข้อมูลการชำระเงินในฐานข้อมูล (Prisma + MongoDB)  
✅ หน้าเว็บตัวอย่างสำหรับผู้ใช้ชำระเงิน  
✅ API RESTful สำหรับระบบอื่นเชื่อมต่อ  

### Flow การทำงาน

```
1. ผู้ใช้/ระบบ → POST /payments/intents (สร้างรายการชำระเงิน)
2. ระบบตอบกลับ QR Code PromptPay
3. ผู้ใช้สแกน QR และชำระเงินผ่านแอปธนาคาร
4. Stripe ส่ง Webhook → POST /payments/webhook (อัปเดตสถานะ)
5. ระบบอัปเดตสถานะในฐานข้อมูล
6. (Optional) ระบบโพล GET /payments/:id เพื่อตรวจสอบสถานะ
```

---

## การติดตั้งและตั้งค่า

### 1. ติดตั้ง Dependencies

ระบบได้ติดตั้ง `stripe` แล้ว แต่หากต้องการติดตั้งใหม่:

```bash
npm install stripe
```

### 2. ตั้งค่า Environment Variables

เพิ่มค่าเหล่านี้ในไฟล์ `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**วิธีหาค่า:**

- `STRIPE_SECRET_KEY`: ดูใน [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- `STRIPE_WEBHOOK_SECRET`: ได้จากคำสั่ง `stripe listen` (ดูด้านล่าง)

### 3. รัน Prisma Migration (สร้างตาราง Payment)

```bash
npx prisma generate
npx prisma db push
```

หรือถ้าใช้ migration:

```bash
npx prisma migrate dev --name add-payment-model
```

### 4. รันเซิร์ฟเวอร์

```bash
npm run start
# หรือ
npm run start:dev
```

เซิร์ฟเวอร์จะทำงานที่ `http://localhost:3000`

### 5. ตั้งค่า Stripe Webhook (สำหรับ Local Development)

#### ติดตั้ง Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_*.tar.gz
sudo mv stripe /usr/local/bin
```

#### Login และ Forward Webhook

```bash
# 1. Login เข้า Stripe account
stripe login

# 2. Forward webhook events ไปยังเซิร์ฟเวอร์ local
stripe listen --forward-to localhost:3000/payments/webhook

# 3. คัดลอก webhook signing secret ที่แสดงในหน้าจอ
# จะได้อะไรแบบนี้: whsec_xxxxxxxxxxxxxxxxxxxxx

# 4. เพิ่มค่าลงใน .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

**หมายเหตุ:** ต้องเปิด terminal นี้ทิ้งไว้ตลอดเวลาที่พัฒนา

---

## การใช้งานหน้า Frontend (HTML)

### เปิดหน้าเว็บตัวอย่าง

หน้าเว็บตัวอย่างอยู่ที่: **`public/payment-example.html`**

#### วิธีที่ 1: เปิดผ่าน File System

```bash
open public/payment-example.html
# หรือ
start public/payment-example.html  # Windows
xdg-open public/payment-example.html  # Linux
```

⚠️ **หมายเหตุ:** ต้องเปลี่ยน `API_BASE_URL` ในไฟล์ให้ตรงกับเซิร์ฟเวอร์

#### วิธีที่ 2: Serve ผ่าน HTTP Server (แนะนำ)

```bash
npx serve public -p 8080
```

จากนั้นเปิด: http://localhost:8080/payment-example.html

### วิธีใช้งานหน้าเว็บ

1. กรอกจำนวนเงิน (บาท) เช่น `100`
2. กรอกรายละเอียด (ไม่บังคับ) เช่น `สั่งซื้อสินค้า #12345`
3. กดปุ่ม **"ชำระเงิน"**
4. QR Code จะแสดงขึ้นมา
5. สแกน QR ด้วยแอปธนาคาร (รองรับ PromptPay)
6. ระบบจะโพลสถานะอัตโนมัติทุก 3 วินาที
7. เมื่อชำระเงินสำเร็จ จะแสดงข้อความ **"✅ ชำระเงินสำเร็จ!"**

### ปรับแต่งหน้าเว็บ

คุณสามารถปรับแต่งหน้าเว็บได้ใน `public/payment-example.html`:

- เปลี่ยนสี/ธีม: แก้ไข CSS ในส่วน `<style>`
- เปลี่ยน API URL: แก้ไข `const API_BASE_URL`
- เปลี่ยนช่วงโพล: แก้ไข `setInterval(..., 3000)` (หน่วยเป็น ms)

---

## API สำหรับระบบอื่นเชื่อมต่อ

ระบบนี้มี REST API สำหรับให้ระบบอื่นๆ เรียกใช้งาน

### Endpoints

#### 1. **สร้าง Payment Intent**

**POST** `/payments/intents`

สร้างรายการชำระเงินใหม่และรับ QR Code

**Request Body:**

```json
{
  "amount": 10000,
  "currency": "thb",
  "description": "สั่งซื้อสินค้า Order #12345",
  "metadata": {
    "orderId": "12345",
    "userId": "user_abc123"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ | จำนวนเงินในหน่วย**สตางค์** (100 = 1 บาท) |
| `currency` | string | ❌ | สกุลเงิน (default: `thb`) |
| `description` | string | ❌ | คำอธิบายรายการ |
| `metadata` | object | ❌ | ข้อมูลเพิ่มเติม (key-value pairs) |

**Response:**

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

#### 2. **ตรวจสอบสถานะการชำระเงิน**

**GET** `/payments/:id`

ตรวจสอบสถานะปัจจุบันของ Payment Intent

**Example:**

```
GET /payments/pi_3xxxxxxxxxxxxxx
```

**Response:**

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

**สถานะที่เป็นไปได้:**

| Status | ความหมาย |
|--------|----------|
| `requires_action` | รอลูกค้าสแกน QR และชำระเงิน |
| `processing` | กำลังประมวลผล |
| `succeeded` | ✅ ชำระเงินสำเร็จ |
| `canceled` | ❌ ยกเลิกแล้ว |
| `requires_payment_method` | ล้มเหลว ต้องชำระใหม่ |

#### 3. **Webhook (สำหรับ Stripe เรียก)**

**POST** `/payments/webhook`

Endpoint นี้ไม่ได้ใช้เรียกจากระบบของคุณโดยตรง แต่เป็น Stripe ที่จะเรียกเมื่อสถานะเปลี่ยนแปลง

**Events ที่รองรับ:**
- `payment_intent.succeeded` - ชำระเงินสำเร็จ
- `payment_intent.payment_failed` - ชำระเงินล้มเหลว
- `payment_intent.canceled` - ยกเลิกการชำระเงิน
- `payment_intent.processing` - กำลังประมวลผล

---

### ตัวอย่างการใช้งาน

#### cURL

```bash
# สร้าง Payment Intent
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

# ตรวจสอบสถานะ
curl http://localhost:3000/payments/pi_3xxxxxxxxxxxxxx
```

#### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// สร้าง Payment Intent
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
console.log('QR Code URL:', qr.imageUrl);

// โพลสถานะ
const checkStatus = async () => {
  const status = await axios.get(`${API_BASE_URL}/payments/${paymentIntentId}`);
  console.log('Status:', status.data.status);
};
```

#### Python

```python
import requests
import time

API_BASE_URL = 'http://localhost:3000'

# สร้าง Payment Intent
response = requests.post(
    f'{API_BASE_URL}/payments/intents',
    json={
        'amount': 10000,
        'currency': 'thb',
        'description': 'สั่งซื้อสินค้า #12345',
        'metadata': {'orderId': '12345'}
    }
)
payment = response.json()
print(f"QR Code URL: {payment['qr']['imageUrl']}")

# โพลสถานะ
while True:
    status = requests.get(f"{API_BASE_URL}/payments/{payment['paymentIntentId']}")
    print(f"Status: {status.json()['status']}")
    if status.json()['status'] == 'succeeded':
        print("✅ ชำระเงินสำเร็จ!")
        break
    time.sleep(3)
```

#### PHP

```php
<?php
$apiBaseUrl = 'http://localhost:3000';

// สร้าง Payment Intent
$data = [
    'amount' => 10000,
    'currency' => 'thb',
    'description' => 'สั่งซื้อสินค้า #12345',
    'metadata' => ['orderId' => '12345']
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
$payment = json_decode($result, true);

echo "QR Code URL: {$payment['qr']['imageUrl']}\n";

// โพลสถานะ
while (true) {
    $status = file_get_contents("$apiBaseUrl/payments/{$payment['paymentIntentId']}");
    $statusData = json_decode($status, true);
    echo "Status: {$statusData['status']}\n";
    
    if ($statusData['status'] === 'succeeded') {
        echo "✅ ชำระเงินสำเร็จ!\n";
        break;
    }
    sleep(3);
}
?>
```

สำหรับตัวอย่างเพิ่มเติมและเอกสารโดยละเอียด ดูที่: **`PAYMENT_INTEGRATION_GUIDE.md`**

---

## การทดสอบ

### ทดสอบด้วยหน้าเว็บ

1. เปิดหน้า `public/payment-example.html`
2. กรอกจำนวนเงินและกดชำระ
3. สแกน QR Code ด้วยแอปธนาคารทดสอบ

### ทดสอบด้วย Stripe CLI

```bash
# เปิด webhook listener ในเทอร์มินัลหนึ่ง
stripe listen --forward-to localhost:3000/payments/webhook

# ในเทอร์มินัลอื่น สร้าง Payment Intent
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "description": "Test Payment"}'

# จำลอง event ชำระเงินสำเร็จ
stripe trigger payment_intent.succeeded
```

### ทดสอบด้วย Postman

1. Import collection จากไฟล์ที่สร้างไว้
2. เรียก `POST /payments/intents`
3. คัดลอก `paymentIntentId`
4. เรียก `GET /payments/:id` เพื่อตรวจสอบสถานะ

---

## โครงสร้างไฟล์

```
src/
├── payments/
│   ├── dto/
│   │   └── create-intent.dto.ts      # DTO สำหรับสร้าง Payment Intent
│   ├── payments.controller.ts        # Controller จัดการ HTTP requests
│   ├── payments.service.ts           # Service logic สำหรับ Stripe และ DB
│   └── payments.module.ts            # Module สำหรับ payments
│
├── prisma/
│   └── schema.prisma                 # Prisma schema (มี Payment model)
│
├── app.module.ts                     # Root module (import PaymentsModule)
└── main.ts                           # Bootstrap application (รองรับ raw body)

public/
└── payment-example.html              # หน้าเว็บตัวอย่างสำหรับผู้ใช้

docs/
├── PAYMENT_INTEGRATION_GUIDE.md     # คู่มือเชื่อมต่อสำหรับระบบอื่น (โดยละเอียด)
└── STRIPE_PROMPTPAY_README.md       # ไฟล์นี้
```

---

## ⚠️ หมายเหตุสำคัญ

### 1. Test Mode vs Live Mode

- **Test Mode**: ใช้ `sk_test_...` - ไม่มีการชำระเงินจริง
- **Live Mode**: ใช้ `sk_live_...` - มีการชำระเงินจริง

**คำเตือน:** PromptPay ใน Test Mode อาจไม่แสดง QR ได้เต็มรูปแบบ ต้องใช้บัญชี Live เพื่อทดสอบจริง

### 2. Security Best Practices

✅ ตรวจสอบจำนวนเงินฝั่ง server เสมอ (ไม่เชื่อข้อมูลจาก client)  
✅ ใช้ metadata เก็บข้อมูลสำคัญ (orderId, userId)  
✅ ตรวจสอบ webhook signature ทุกครั้ง  
✅ ใช้ HTTPS ใน production  
✅ กำหนด rate limiting  
✅ Log ทุก transaction  

### 3. จำนวนเงิน

- หน่วยเป็น **สตางค์** (satang): `10000 = 100.00 THB`
- ขั้นต่ำ: `1 สตางค์ (0.01 THB)`
- สูงสุด: ตามข้อจำกัดของ Stripe/ธนาคาร

### 4. Webhook Timeout

- Payment Intent จะหมดอายุภายใน **24 ชั่วโมง**
- แนะนำกำหนด timeout ของการโพลเอง (เช่น 15-30 นาที)

---

## 🆘 การแก้ปัญหา

### ปัญหา: QR Code ไม่แสดง

**สาเหตุ:**
- ยังไม่ได้ตั้งค่า `STRIPE_SECRET_KEY`
- ใช้ Test Mode ที่ไม่รองรับ PromptPay

**วิธีแก้:**
- ตรวจสอบ `.env` ว่ามี `STRIPE_SECRET_KEY`
- ลองใช้ Live Mode (ต้องยืนยันบัญชีธุรกิจ)

### ปัญหา: Webhook ไม่ทำงาน

**สาเหตุ:**
- ไม่ได้เปิด `stripe listen`
- `STRIPE_WEBHOOK_SECRET` ไม่ถูกต้อง

**วิธีแก้:**
- เปิด terminal รัน `stripe listen --forward-to localhost:3000/payments/webhook`
- คัดลอก secret ที่ได้ไปใส่ใน `.env`

### ปัญหา: Database Error

**สาเหตุ:**
- ยังไม่ได้รัน Prisma migration

**วิธีแก้:**
```bash
npx prisma generate
npx prisma db push
```

---

## 📚 เอกสารเพิ่มเติม

- [Stripe PromptPay Documentation](https://stripe.com/docs/payments/promptpay)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Reference](https://stripe.com/docs/cli)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 📞 ติดต่อและสนับสนุน

หากมีปัญหาหรือข้อสงสัย:

1. ตรวจสอบ logs ที่ console/terminal
2. ดูเอกสาร Stripe และ NestJS
3. ทดสอบด้วย `stripe listen` เพื่อดู event
4. ตรวจสอบฐานข้อมูลว่ามีข้อมูลหรือไม่

---

## ✅ Checklist ก่อนใช้งาน Production

- [ ] เปลี่ยน `sk_test_` เป็น `sk_live_`
- [ ] ตั้งค่า Webhook URL ที่ Stripe Dashboard (https://yourdomain.com/payments/webhook)
- [ ] เปิดใช้งาน HTTPS
- [ ] ตั้งค่า Rate Limiting
- [ ] ตั้งค่า Logging และ Monitoring
- [ ] ทดสอบกับเงินจำนวนน้อยๆ ก่อน
- [ ] เพิ่ม Error Handling และ Retry Logic
- [ ] ตั้งค่า Timeout สำหรับการโพล
- [ ] ทบทวน Security Practices
- [ ] Backup ฐานข้อมูล

---

**สร้างโดย:** ระบบ AI Assistant  
**อัปเดตล่าสุด:** October 30, 2025  
**License:** MIT

