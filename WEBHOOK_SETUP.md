# 🔧 การตั้งค่า Stripe Webhook

## 📋 วิธีตั้งค่า Webhook สำหรับ Local Development

### 1. ติดตั้ง Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# หรือดาวน์โหลดจาก https://stripe.com/docs/stripe-cli
```

### 2. Login เข้า Stripe

```bash
stripe login
```

### 3. Forward Webhooks ไปยัง Local Server

```bash
stripe listen --forward-to localhost:3000/payments/webhook
```

คำสั่งนี้จะ:
- ฟัง webhook events จาก Stripe
- Forward ไปยัง `http://localhost:3000/payments/webhook`
- แสดง webhook signing secret (ขึ้นต้นด้วย `whsec_`)

### 4. คัดลอก Webhook Secret

เมื่อรันคำสั่ง `stripe listen` จะแสดงข้อความประมาณนี้:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
```

คัดลอกค่า `whsec_...` และเพิ่มในไฟล์ `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. ทดสอบ Webhook

เปิด terminal อีกหน้าต่างหนึ่งและรัน:

```bash
stripe trigger payment_intent.succeeded
```

คำสั่งนี้จะส่ง test webhook event ไปยัง local server

---

## 🌐 วิธีตั้งค่า Webhook สำหรับ Production

### 1. เข้า Stripe Dashboard

1. ไปที่ [Stripe Dashboard](https://dashboard.stripe.com)
2. เลือก **Developers** → **Webhooks**
3. คลิก **Add endpoint**

### 2. ตั้งค่า Webhook Endpoint

- **Endpoint URL**: `https://your-domain.com/payments/webhook`
- **Description**: "Payment Webhook Handler"
- **Events to send**: เลือก events ที่ต้องการ:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `payment_intent.processing`

### 3. คัดลอก Signing Secret

หลังจากสร้าง webhook endpoint แล้ว:
1. คลิกที่ webhook endpoint ที่สร้าง
2. คัดลอก **Signing secret** (ขึ้นต้นด้วย `whsec_`)
3. เพิ่มใน environment variables:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. ทดสอบ Webhook

1. ใน Stripe Dashboard → Webhooks
2. คลิกที่ webhook endpoint
3. คลิก **Send test webhook**
4. เลือก event type: `payment_intent.succeeded`
5. คลิก **Send test webhook**

---

## 🔍 วิธีตรวจสอบว่า Webhook ทำงาน

### 1. ตรวจสอบ Logs

เมื่อ webhook ถูกเรียก คุณจะเห็น logs ประมาณนี้:

```
[Webhook] Received webhook request
[Webhook] Signature: Present
[Webhook] Raw body length: 1234
[PaymentsService] Verifying webhook signature...
[PaymentsService] Webhook signature verified successfully. Event type: payment_intent.succeeded
[PaymentsService] Processing webhook event: payment_intent.succeeded
[PaymentsService] Payment succeeded: pi_xxxxx
```

### 2. ตรวจสอบใน Stripe Dashboard

1. ไปที่ **Developers** → **Webhooks**
2. คลิกที่ webhook endpoint
3. ดู **Recent deliveries** เพื่อดูว่า webhook ถูกส่งหรือไม่
4. คลิกที่ delivery เพื่อดู:
   - **Status**: สำเร็จหรือล้มเหลว
   - **Response**: คำตอบจาก server
   - **Request**: ข้อมูลที่ส่งไป

### 3. ตรวจสอบ Database

ตรวจสอบว่า payment status ถูกอัปเดต:

```sql
SELECT * FROM payments WHERE stripe_payment_intent_id = 'pi_xxxxx';
```

---

## ❌ ปัญหาที่พบบ่อย

### 1. Webhook ไม่ถูกเรียก

**สาเหตุ:**
- Webhook endpoint URL ไม่ถูกต้อง
- Server ไม่สามารถเข้าถึงได้จาก internet (สำหรับ production)
- Stripe CLI ไม่ได้รัน (สำหรับ local)

**วิธีแก้:**
- ตรวจสอบ URL ใน Stripe Dashboard
- ใช้ ngrok หรือ tunnel service สำหรับ local development
- รัน `stripe listen --forward-to localhost:3000/payments/webhook`

### 2. Webhook Signature Verification Failed

**สาเหตุ:**
- `STRIPE_WEBHOOK_SECRET` ไม่ถูกต้อง
- ใช้ webhook secret จาก endpoint อื่น
- Raw body ไม่ถูกต้อง

**วิธีแก้:**
- ตรวจสอบว่า `STRIPE_WEBHOOK_SECRET` ตรงกับ webhook endpoint
- ใช้ webhook secret ที่ถูกต้องสำหรับ endpoint นั้น
- ตรวจสอบว่า `rawBody: true` ถูกตั้งค่าใน `main.ts`

### 3. Missing Raw Body

**สาเหตุ:**
- `rawBody: true` ไม่ได้ถูกตั้งค่าใน NestFactory
- Middleware อื่นๆ แก้ไข body

**วิธีแก้:**
- ตรวจสอบ `main.ts` ว่ามี `rawBody: true` ใน NestFactory options
- ตรวจสอบว่าไม่มี middleware ที่แก้ไข body ก่อน webhook handler

---

## 🧪 ทดสอบ Webhook ด้วย Stripe CLI

### ส่ง Test Event

```bash
# ส่ง payment_intent.succeeded event
stripe trigger payment_intent.succeeded

# ส่ง payment_intent.payment_failed event
stripe trigger payment_intent.payment_failed

# ส่ง payment_intent.canceled event
stripe trigger payment_intent.canceled
```

### ดู Webhook Logs

```bash
stripe logs tail
```

คำสั่งนี้จะแสดง webhook events ที่ถูกส่งและ response จาก server

---

## 📝 หมายเหตุ

- สำหรับ local development ต้องใช้ Stripe CLI
- สำหรับ production ต้องตั้งค่า webhook endpoint ใน Stripe Dashboard
- Webhook secret จะแตกต่างกันระหว่าง local และ production
- ตรวจสอบ logs เสมอเพื่อดูว่า webhook ถูกเรียกหรือไม่

