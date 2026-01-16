# 🔄 Webhook vs Polling สำหรับ Payment Status

## 📋 สรุป

ระบบรองรับ **2 วิธี** ในการตรวจสอบสถานะการชำระเงิน:

### 1. **Webhook (แนะนำสำหรับ Production)**
- Stripe จะส่ง webhook event เมื่อสถานะเปลี่ยน
- ทำงานแบบ real-time
- ต้องตั้งค่า webhook endpoint ใน Stripe Dashboard
- สำหรับ local development ต้องใช้ Stripe CLI

### 2. **Polling (Fallback สำหรับ Local Development)**
- ตรวจสอบสถานะจาก Stripe API เป็นระยะๆ
- ทำงานเมื่อ `getPaymentIntentStatus()` ถูกเรียก
- ไม่ต้องตั้งค่า webhook
- เหมาะสำหรับ local development

---

## 🔧 การทำงานของระบบ

### Flow การชำระเงิน:

```
1. ผู้ใช้เลือกแพ็ค → สร้าง PaymentIntent
   ↓
2. แสดง QR Code ให้ผู้ใช้สแกน
   ↓
3. ผู้ใช้ชำระเงินผ่าน PromptPay
   ↓
4. Stripe อัปเดตสถานะ payment_intent
   ↓
5. ระบบตรวจสอบสถานะผ่าน 2 วิธี:
   
   A. Webhook (ถ้า setup แล้ว):
      - Stripe → POST /payments/webhook
      - handleWebhookEvent()
      - handlePaymentSuccess()
      - updatePaymentEmbed() ✅
   
   B. Polling (fallback):
      - getPaymentIntentStatus() ถูกเรียก (จาก frontend หรือ polling)
      - ตรวจสอบสถานะจาก Stripe API
      - ถ้าสถานะเป็น SUCCEEDED → handlePaymentSuccess()
      - updatePaymentEmbed() ✅
```

---

## 🚀 สำหรับ Local Development

### วิธีที่ 1: ใช้ Stripe CLI (แนะนำ)

```bash
# 1. ติดตั้ง Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Forward webhooks
stripe listen --forward-to localhost:3000/payments/webhook

# 4. คัดลอก webhook secret และเพิ่มใน .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**ข้อดี:**
- Webhook จะทำงานเหมือน production
- Real-time updates
- ไม่ต้อง polling

### วิธีที่ 2: ใช้ Polling (ไม่ต้อง setup)

```bash
# ไม่ต้องทำอะไร เพียงแค่:
# - รัน server: npm run start:dev
# - ใช้ระบบตามปกติ
```

**การทำงาน:**
- เมื่อ `getPaymentIntentStatus()` ถูกเรียก (เช่น จาก frontend polling)
- ระบบจะตรวจสอบสถานะจาก Stripe API
- ถ้าสถานะเป็น SUCCEEDED → จะเรียก `handlePaymentSuccess()` อัตโนมัติ
- Bot จะอัปเดต embed ✅

**ข้อดี:**
- ไม่ต้อง setup webhook
- ทำงานได้ทันที
- เหมาะสำหรับ testing

**ข้อเสีย:**
- ต้องมีการเรียก API เพื่อตรวจสอบสถานะ
- อาจจะช้ากว่า webhook เล็กน้อย

---

## 🌐 สำหรับ Production

### ตั้งค่า Webhook ใน Stripe Dashboard

1. ไปที่ [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. คลิก **Add endpoint**
3. ตั้งค่า:
   - **Endpoint URL**: `https://your-domain.com/payments/webhook`
   - **Events to send**: 
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.processing`
4. คัดลอก **Signing secret** และเพิ่มใน environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Polling เป็น Fallback

ระบบจะยังคงใช้ polling เป็น fallback:
- ถ้า webhook ไม่ทำงาน (เช่น network issue)
- เมื่อ `getPaymentIntentStatus()` ถูกเรียก
- ระบบจะตรวจสอบสถานะและอัปเดต embed อัตโนมัติ

---

## 🔍 วิธีตรวจสอบว่า Webhook ทำงานหรือไม่

### ดู Logs:

**Webhook ทำงาน:**
```
[Webhook] Received webhook request
[PaymentsService] Processing webhook event: payment_intent.succeeded
[handlePaymentSuccess] Processing payment success for: pi_xxxxx
[updatePaymentEmbed] Starting update for message xxx
```

**Polling ทำงาน (fallback):**
```
[PaymentsService] Status changed: PROCESSING -> SUCCEEDED for pi_xxxxx
[getPaymentIntentStatus] Payment succeeded, calling handlePaymentSuccess
[handlePaymentSuccess] Processing payment success for: pi_xxxxx
[updatePaymentEmbed] Starting update for message xxx
```

---

## ⚠️ หมายเหตุ

1. **Webhook จะ trigger ได้เมื่อ:**
   - Server สามารถรับ request จาก Stripe ได้ (ต้อง expose ไปยัง internet)
   - สำหรับ local: ต้องใช้ Stripe CLI หรือ tunnel (ngrok)

2. **Polling จะทำงานเมื่อ:**
   - `getPaymentIntentStatus()` ถูกเรียก
   - Frontend polling (เช่น payment.html)
   - Manual API call

3. **ทั้งสองวิธีจะอัปเดต embed:**
   - Webhook → `handleWebhookEvent()` → `handlePaymentSuccess()` → `updatePaymentEmbed()`
   - Polling → `getPaymentIntentStatus()` → `handlePaymentSuccess()` → `updatePaymentEmbed()`

---

## 🎯 สรุป

- **Local Development**: ใช้ Polling (ไม่ต้อง setup) หรือ Stripe CLI (ถ้าต้องการ webhook)
- **Production**: ตั้งค่า Webhook ใน Stripe Dashboard + Polling เป็น fallback
- **Bot จะอัปเดต embed ในทั้งสองกรณี** ✅

