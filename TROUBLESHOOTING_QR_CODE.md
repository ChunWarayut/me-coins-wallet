# 🔧 แก้ปัญหา: ไม่พบข้อมูล QR Code

## ❌ ปัญหา

เมื่อเรียก API `/payments/intents` แล้วได้ error:
```
ไม่พบข้อมูล QR Code
```

---

## 🔍 สาเหตุ

ปัญหานี้เกิดได้จาก 3 สาเหตุหลัก:

### 1. ใช้ Test Mode (สาเหตุที่พบบ่อยที่สุด) ⚠️

Stripe **Test Mode** (`sk_test_...`) **ไม่รองรับ PromptPay อย่างเต็มรูปแบบ**

PromptPay เป็นระบบชำระเงินเฉพาะประเทศไทย และ Stripe จะสร้าง QR Code ได้เฉพาะใน **Live Mode** เท่านั้น

### 2. บัญชี Stripe ยังไม่ได้ตั้งค่าสำหรับ PromptPay

บัญชี Stripe ต้อง:
- ✅ ยืนยันตัวตนเป็นธุรกิจในประเทศไทย
- ✅ เปิดใช้งาน PromptPay payment method
- ✅ ผ่านการตรวจสอบจาก Stripe

### 3. API Version ไม่ตรงกัน

บางครั้ง Stripe API version อาจเปลี่ยน property name ของ QR Code response

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: เปลี่ยนเป็น Live Mode (แนะนำ)

#### ขั้นตอน:

1. **เข้า Stripe Dashboard**
   - ไปที่: https://dashboard.stripe.com/apikeys
   - สลับจาก "Test mode" เป็น "Live mode" (toggle ด้านบน)

2. **คัดลอก Live Secret Key**
   ```
   sk_live_YOUR_LIVE_SECRET_KEY_HERE
   ```

3. **แก้ไข .env**
   ```env
   # เปลี่ยนจาก Test Key
   # STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
   
   # เป็น Live Key
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
   ```

4. **ตั้งค่า Live Webhook**
   ```bash
   # ใช้ --forward-to กับ live mode
   stripe listen --forward-to localhost:3000/payments/webhook --live
   ```

5. **Restart เซิร์ฟเวอร์**
   ```bash
   npm run start:dev
   ```

6. **ทดสอบอีกครั้ง**
   ```bash
   curl -X POST http://localhost:3000/payments/intents \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "description": "Test Live Mode"}'
   ```

⚠️ **คำเตือน**: Live Mode จะใช้เงินจริง! แนะนำทดสอบด้วยจำนวนเงินน้อยๆ (เช่น 1 บาท = 100 สตางค์)

---

### วิธีที่ 2: ตรวจสอบและเปิดใช้งาน PromptPay ใน Stripe

ตามเอกสารของ Stripe ([PromptPay Documentation](https://docs.stripe.com/payments/promptpay)), PromptPay มีข้อกำหนดดังนี้:

#### ข้อกำหนดสำคัญ:
- **ประเทศ**: รองรับเฉพาะ **Thailand (TH)** เท่านั้น
- **สกุลเงิน**: รองรับเฉพาะ **THB** (บาทไทย)
- **Product Support**: รองรับทั้ง Checkout, Elements, Payment Links, Invoicing และ Subscriptions

#### 1. ตรวจสอบประเทศของบัญชี Stripe

**สำคัญมาก!** PromptPay รองรับเฉพาะบัญชีที่ลงทะเบียนในประเทศไทยเท่านั้น

```bash
# ตรวจสอบผ่าน API
curl https://api.stripe.com/v1/account \
  -u "sk_test_xxx:"

# ดูที่ field "country" ต้องเป็น "TH"
```

หรือตรวจสอบผ่าน Dashboard:
- เข้า: https://dashboard.stripe.com/settings/account
- ตรวจสอบว่า **Business country** เป็น **Thailand (TH)** หรือไม่
- ⚠️ **ถ้าไม่ใช่ประเทศไทย PromptPay จะไม่สามารถใช้งานได้**

#### 2. เปิดใช้งาน PromptPay ใน Dashboard

- เข้า: https://dashboard.stripe.com/settings/payment_methods
- สลับเป็น **Live Mode** (toggle ด้านบน)
- ค้นหา **"PromptPay"**
- คลิก **"Enable"** หรือ **"Turn on"**
- บันทึกการเปลี่ยนแปลง

#### 3. ตรวจสอบ Account Capabilities

ตามเอกสาร [Account Capabilities](https://docs.stripe.com/connect/account-capabilities), PromptPay ต้องการ capability `promptpay_payments`:

```bash
# ตรวจสอบ capabilities ที่เปิดใช้งาน
curl https://api.stripe.com/v1/account/capabilities \
  -u "sk_live_xxx:"

# หรือสำหรับ Connected Account
curl https://api.stripe.com/v1/accounts/{{ACCOUNT_ID}}/capabilities \
  -u "sk_live_xxx:"
```

ใน response ควรเห็น:
```json
{
  "promptpay_payments": {
    "status": "active",
    "requested": true
  }
}
```

ถ้า status ไม่เป็น "active" ให้ request capability:
```bash
curl https://api.stripe.com/v1/accounts/{{ACCOUNT_ID}}/capabilities/promptpay_payments \
  -u "sk_live_xxx:" \
  -d requested=true
```

#### 4. ยืนยันตัวตนธุรกิจ (Live Mode เท่านั้น)

Stripe ต้องการเอกสารยืนยันธุรกิจก่อนเปิดใช้งาน Live Mode:

**เอกสารที่ต้องการ:**
- หนังสือรับรองบริษัท / ทะเบียนการค้า
- บัตรประชาชนผู้มีอำนาจลงนาม
- หนังสือรับรองที่อยู่บริษัท
- เลขประจำตัวผู้เสียภาษี (Tax ID)

**วิธีอัปโหลด:**
- เข้า: https://dashboard.stripe.com/settings/account
- ไปที่ส่วน **"Business details"** หรือ **"Verification"**
- อัปโหลดเอกสารตามที่ระบบขอ
- รอการตรวจสอบ (โดยปกติ 1-3 วันทำการ)

#### 5. ตรวจสอบสถานะการยืนยันตัวตน

```bash
curl https://api.stripe.com/v1/account \
  -u "sk_live_xxx:"
```

ดูที่ field:
```json
{
  "charges_enabled": true,
  "payouts_enabled": true,
  "requirements": {
    "currently_due": [],  // ต้องว่างเปล่า
    "disabled_reason": null
  }
}
```

ถ้า `currently_due` ไม่ว่าง แสดงว่ายังมีเอกสารที่ต้องส่งเพิ่ม

---

### วิธีที่ 3: ดูข้อมูล Debug จาก Server Log

เมื่อเรียก API แล้ว ดูที่ terminal ของเซิร์ฟเวอร์ จะมี log แบบนี้:

```
[PaymentsService] Creating PaymentIntent: 10000 thb
[PaymentsService] Payment Intent Status: requires_action, Next Action Type: undefined
[PaymentsService] QR Code not found. Next action type: undefined. Available properties: []
```

**วิธีอ่าน:**

- `Status: requires_action` → ✅ ถูกต้อง (ต้องรอ action)
- `Next Action Type: undefined` → ❌ ไม่มีข้อมูล next_action
- `Available properties: []` → ❌ ไม่มี properties ของ QR Code

**หมายความว่า:** Stripe ไม่ได้ส่ง QR Code กลับมา → ใช้ Test Mode หรือบัญชียังไม่พร้อม

---

### วิธีที่ 4: ทดสอบด้วย Stripe CLI

```bash
# ดู Payment Intent ที่สร้าง
stripe payment_intents list --limit 1

# ดูรายละเอียดของ Payment Intent
stripe payment_intents retrieve pi_xxxxxxxxxxxxx

# ตรวจสอบว่ามี next_action หรือไม่
```

ถ้าใน response ไม่มี `next_action` หรือ `next_action` ไม่มี QR Code data → ต้องใช้ Live Mode

---

## 🎯 วิธีทดสอบที่ปลอดภัย (Live Mode)

เพื่อไม่ให้เสียเงินมาก แนะนำ:

### 1. ชำระเงินจำนวนน้อย
```json
{
  "amount": 100,  // 1 บาท
  "description": "Test PromptPay Live Mode"
}
```

### 2. ชำระเงินจริง
- สแกน QR Code ด้วยแอปธนาคาร
- ชำระเงิน 1 บาท
- ตรวจสอบว่าระบบทำงานถูกต้อง

### 3. Refund (คืนเงิน)
```bash
# ผ่าน Stripe Dashboard
# หรือผ่าน API
stripe refunds create --payment-intent pi_xxxxxxxxxxxxx
```

---

## 📊 ตรวจสอบว่าแก้ไขสำเร็จ

### ✅ สัญญาณว่าทำงานถูกต้อง:

```json
{
  "paymentIntentId": "pi_xxxxxxxxxxxxx",
  "status": "requires_action",
  "qr": {
    "imageUrl": "https://qr.stripe.com/...png",  // ✅ มี URL
    "data": "00020101021..."                      // ✅ มี QR data
  },
  "error": null  // ✅ ไม่มี error
}
```

### ❌ สัญญาณว่ายังมีปัญหา:

```json
{
  "paymentIntentId": "pi_xxxxxxxxxxxxx",
  "status": "requires_action",
  "qr": null,  // ❌ ไม่มี QR
  "error": "QR Code not available..."  // ❌ มี error message
}
```

---

## 🔄 Alternative: ใช้ Stripe Checkout (ไม่ต้องสร้าง QR เอง)

ถ้าไม่ต้องการจัดการ QR Code เอง สามารถใช้ **Stripe Checkout** แทน:

```typescript
// สร้าง Checkout Session แทน Payment Intent
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['promptpay'],
  line_items: [{
    price_data: {
      currency: 'thb',
      product_data: {
        name: 'สินค้า',
      },
      unit_amount: 10000,
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: 'https://yourdomain.com/success',
  cancel_url: 'https://yourdomain.com/cancel',
});

// Redirect ไปหน้า Stripe (Stripe จะแสดง QR ให้เอง)
// session.url
```

**ข้อดี:**
- ไม่ต้องสร้าง QR เอง
- Stripe จัดการหน้า UI ให้
- รองรับทั้ง Test และ Live Mode

**ข้อเสีย:**
- ต้อง redirect ไปหน้า Stripe
- customize UI ได้น้อยกว่า

---

## 📞 ติดต่อ Stripe Support

ถ้ายังแก้ไม่ได้ ติดต่อ Stripe Support:

1. เข้า: https://support.stripe.com/
2. เลือก "Contact Support"
3. แจ้งปัญหา: "PromptPay QR Code not showing in Payment Intent"
4. แนบข้อมูล:
   - Payment Intent ID
   - Country: Thailand
   - Account ID

---

## 📚 เอกสารอ้างอิงจาก Stripe

### เอกสารหลัก:
- **[PromptPay Payments](https://docs.stripe.com/payments/promptpay)** - คู่มือการใช้งาน PromptPay
- **[How to Enable PromptPay](https://support.stripe.com/questions/how-to-enable-promptpay)** - วิธีเปิดใช้งาน PromptPay
- **[Account Capabilities](https://docs.stripe.com/connect/account-capabilities)** - การจัดการ Capabilities
- **[Payment Intent API Reference](https://docs.stripe.com/api/payment_intents)** - API Documentation
- **[Testing PromptPay](https://docs.stripe.com/testing#promptpay)** - วิธีทดสอบ

### ข้อมูลสำคัญจากเอกสาร:

#### จาก [PromptPay Documentation](https://docs.stripe.com/payments/promptpay):
- **Customer locations**: Thailand
- **Presentment currency**: THB เท่านั้น
- **Payment confirmation**: Customer-initiated (ลูกค้าต้องยืนยันเอง)
- **Refunds support**: รองรับการคืนเงิน (ต้องมี email ของลูกค้า)
- **Statement descriptor**: แสดงเป็น "STRIPE PAYMENTS (THAILAND) LTD" เท่านั้น (ไม่สามารถปรับแต่งได้)

#### จาก [Account Capabilities](https://docs.stripe.com/connect/account-capabilities):
- ต้อง request capability `promptpay_payments`
- Capability status ต้องเป็น "active" ถึงจะใช้งานได้
- Test Mode อาจไม่ enforce capabilities อย่างเข้มงวด
- Connected Accounts ต้อง request capabilities แยกต่างหาก

---

## ✅ Checklist การแก้ปัญหา

### ขั้นตอนที่ 1: ตรวจสอบบัญชี Stripe
- [ ] บัญชี Stripe ลงทะเบียนในประเทศไทย (TH) ✨ **สำคัญที่สุด**
- [ ] ยืนยันตัวตนธุรกิจเรียบร้อยแล้ว (Live Mode เท่านั้น)
- [ ] `charges_enabled: true` และ `payouts_enabled: true`
- [ ] `requirements.currently_due` เป็น array ว่าง `[]`

### ขั้นตอนที่ 2: เปิดใช้งาน PromptPay
- [ ] เปิดใช้งาน PromptPay ใน Dashboard → Settings → Payment Methods
- [ ] Request capability `promptpay_payments` (ตรวจสอบ status = "active")
- [ ] ทดสอบใน **Live Mode** (Test Mode ไม่รองรับ PromptPay เต็มรูปแบบ)

### ขั้นตอนที่ 3: ตั้งค่าระบบ
- [ ] ใช้ `sk_live_` (Live Secret Key) แทน `sk_test_` ใน `.env`
- [ ] ตั้งค่า webhook สำหรับ Live Mode: `stripe listen --forward-to localhost:3000/payments/webhook --live`
- [ ] คัดลอก Live webhook secret ไปใส่ `STRIPE_WEBHOOK_SECRET` ใน `.env`
- [ ] Restart เซิร์ฟเวอร์หลังแก้ไข .env: `npm run start:dev`

### ขั้นตอนที่ 4: ทดสอบ
- [ ] ทดสอบด้วยจำนวนเงินน้อยๆ (1-10 บาท)
- [ ] ดู server logs เพื่อหาข้อมูล debug
- [ ] ตรวจสอบว่าได้ QR Code URL กลับมา
- [ ] สแกน QR และชำระเงินจริง
- [ ] Refund เงินกลับมา (ถ้าต้องการ)

### การตรวจสอบด้วย API:
```bash
# 1. ตรวจสอบประเทศบัญชี (ต้องเป็น TH)
curl https://api.stripe.com/v1/account -u "sk_live_xxx:"

# 2. ตรวจสอบ PromptPay capability (ต้องเป็น active)
curl https://api.stripe.com/v1/account/capabilities -u "sk_live_xxx:"

# 3. ทดสอบสร้าง Payment Intent
curl -X POST https://api.stripe.com/v1/payment_intents \
  -u "sk_live_xxx:" \
  -d amount=100 \
  -d currency=thb \
  -d "payment_method_types[]"=promptpay
```

---

**สรุป:** ส่วนใหญ่แล้วปัญหานี้เกิดจากการใช้ Test Mode กรุณาเปลี่ยนเป็น Live Mode และทดสอบด้วยเงินจริงจำนวนน้อย (1 บาท) แล้ว refund กลับมา 🎉

