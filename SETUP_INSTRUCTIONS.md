# 📝 คำแนะนำการตั้งค่าระบบชำระเงิน Stripe PromptPay

## ⚠️ สำคัญ: ต้องทำก่อนใช้งาน

ระบบชำระเงินได้ถูกเพิ่มเข้ามาแล้ว แต่ยังต้อง**ตั้งค่าเพิ่มเติม**ดังนี้:

---

## 📦 Step 1: Generate Prisma Client

เนื่องจากมีการเพิ่ม `Payment` model ใหม่ใน Prisma schema จำเป็นต้อง generate client ใหม่:

```bash
npx prisma generate
```

จากนั้นอัปเดตฐานข้อมูล:

```bash
npx prisma db push
```

หรือถ้าใช้ migration:

```bash
npx prisma migrate dev --name add-payment-model
```

---

## 🔑 Step 2: ตั้งค่า Environment Variables

เพิ่มค่าเหล่านี้ในไฟล์ `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### วิธีหาค่า:

1. **STRIPE_SECRET_KEY**:
   - เข้า [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - คัดลอก "Secret key" (ขึ้นต้นด้วย `sk_test_` หรือ `sk_live_`)

2. **STRIPE_WEBHOOK_SECRET**:
   - ติดตั้ง Stripe CLI: `brew install stripe/stripe-cli/stripe` (macOS)
   - Login: `stripe login`
   - รันคำสั่ง: `stripe listen --forward-to localhost:3000/payments/webhook`
   - คัดลอก webhook signing secret ที่แสดง (ขึ้นต้นด้วย `whsec_`)

---

## 🚀 Step 3: รันเซิร์ฟเวอร์

```bash
npm run start:dev
```

---

## 🧪 Step 4: ทดสอบระบบ

### วิธีที่ 1: ใช้หน้าเว็บตัวอย่าง

```bash
# เปิดไฟล์ในเบราว์เซอร์
open public/payment-example.html

# หรือ serve ผ่าน HTTP server
npx serve public -p 8080
# จากนั้นเปิด: http://localhost:8080/payment-example.html
```

### วิธีที่ 2: ใช้ cURL

```bash
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "description": "ทดสอบชำระเงิน"
  }'
```

---

## 📊 ตรวจสอบว่าทำงานถูกต้อง

### ✅ ตรวจสอบ Prisma Client

```bash
# ตรวจสอบว่า Payment model ถูก generate แล้ว
cat node_modules/.prisma/client/index.d.ts | grep "export type Payment"
```

ถ้าเห็น `export type Payment` แสดงว่าสำเร็จ

### ✅ ตรวจสอบ Environment Variables

```bash
# ตรวจสอบว่าค่าถูกตั้งไว้
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
```

### ✅ ตรวจสอบ API Endpoints

```bash
# ตรวจสอบว่า endpoint ทำงาน
curl http://localhost:3000/payments/intents -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "test"}'
```

ถ้าได้ response กลับมา (ไม่ใช่ error 404) แสดงว่าสำเร็จ

---

## 🗂️ ไฟล์ที่ถูกเพิ่ม/แก้ไข

### ไฟล์ใหม่:
- `src/payments/` - โมดูลชำระเงินทั้งหมด
  - `payments.controller.ts` - Controller
  - `payments.service.ts` - Business logic
  - `payments.module.ts` - Module definition
  - `dto/create-intent.dto.ts` - Data Transfer Object
- `public/payment-example.html` - หน้าเว็บตัวอย่าง
- `STRIPE_PROMPTPAY_README.md` - คู่มือใช้งานโดยละเอียด
- `PAYMENT_INTEGRATION_GUIDE.md` - คู่มือ API สำหรับนักพัฒนา
- `QUICK_START_PAYMENT.md` - คู่มือเริ่มต้นอย่างรวดเร็ว

### ไฟล์ที่แก้ไข:
- `prisma/schema.prisma` - เพิ่ม Payment model
- `src/app.module.ts` - เพิ่ม PaymentsModule
- `src/main.ts` - เปิดใช้งาน raw body สำหรับ webhook
- `README.md` - เพิ่มข้อมูลระบบชำระเงิน
- `package.json` - เพิ่ม stripe dependency

---

## 🆘 แก้ปัญหา

### ปัญหา: Type error เกี่ยวกับ `prisma.payment`

**สาเหตุ:** ยังไม่ได้รัน `npx prisma generate`

**วิธีแก้:**
```bash
npx prisma generate
```

### ปัญหา: Webhook ไม่ทำงาน

**สาเหตุ:** ยังไม่ได้เปิด `stripe listen`

**วิธีแก้:**
```bash
# Terminal แยก
stripe listen --forward-to localhost:3000/payments/webhook
```

### ปัญหา: QR Code ไม่แสดง

**สาเหตุ:** Test Mode อาจไม่รองรับ PromptPay เต็มรูปแบบ

**วิธีแก้:**
- ใช้ Live Mode (ต้องยืนยันบัญชีธุรกิจ)
- หรือใช้ Stripe Dashboard ดู Payment Intent ที่สร้าง

---

## 📚 เอกสารอ้างอิง

1. **[QUICK_START_PAYMENT.md](./QUICK_START_PAYMENT.md)** - เริ่มใช้งานใน 5 นาที
2. **[STRIPE_PROMPTPAY_README.md](./STRIPE_PROMPTPAY_README.md)** - คู่มือครบถ้วน
3. **[PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md)** - API Reference

---

## ✅ Checklist การตั้งค่า

กรุณาทำตามลำดับ:

- [ ] 1. รัน `npx prisma generate`
- [ ] 2. รัน `npx prisma db push`
- [ ] 3. ตั้งค่า `STRIPE_SECRET_KEY` ใน `.env`
- [ ] 4. ติดตั้ง Stripe CLI
- [ ] 5. รัน `stripe login`
- [ ] 6. เปิด `stripe listen --forward-to localhost:3000/payments/webhook`
- [ ] 7. คัดลอก webhook secret ไปใส่ `STRIPE_WEBHOOK_SECRET` ใน `.env`
- [ ] 8. รัน `npm run start:dev`
- [ ] 9. ทดสอบด้วยหน้าเว็บหรือ cURL

---

**เมื่อทำครบทุกขั้นตอนแล้ว ระบบจะพร้อมใช้งาน! 🎉**

ถ้ามีปัญหาเพิ่มเติม ดูได้ที่ `STRIPE_PROMPTPAY_README.md` ในส่วน "🆘 การแก้ปัญหา"

