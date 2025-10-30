# ⚡ Quick Start - ระบบชำระเงิน Stripe PromptPay

## 🚀 เริ่มใช้งานใน 5 นาที

### 1. ติดตั้งและตั้งค่า

```bash
# 1. Stripe SDK ติดตั้งแล้ว (มากับโปรเจกต์)

# 2. ตั้งค่า Environment Variables
# สร้างไฟล์ .env และเพิ่ม:
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# 3. สร้างตาราง Payment ในฐานข้อมูล
npx prisma generate
npx prisma db push

# 4. รันเซิร์ฟเวอร์
npm run start:dev
```

### 2. ตั้งค่า Webhook (Local Development)

```bash
# Terminal 1: รันเซิร์ฟเวอร์
npm run start:dev

# Terminal 2: เปิด Stripe webhook listener
stripe login
stripe listen --forward-to localhost:3000/payments/webhook

# คัดลอก webhook secret ที่ได้ไปใส่ใน .env
```

### 3. ทดสอบระบบ

#### ▶️ วิธีที่ 1: ใช้หน้าเว็บ (แนะนำ)

```bash
# เปิดหน้าเว็บตัวอย่าง
open public/payment-example.html

# หรือ serve ผ่าน HTTP
npx serve public -p 8080
# จากนั้นเปิด: http://localhost:8080/payment-example.html
```

#### ▶️ วิธีที่ 2: ใช้ cURL

```bash
# สร้าง Payment Intent (จำนวนเงินในสตางค์: 10000 = 100 บาท)
curl -X POST http://localhost:3000/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "description": "ทดสอบชำระเงิน"
  }'

# Response จะได้:
# - paymentIntentId: ใช้ตรวจสอบสถานะ
# - qr.imageUrl: URL ของ QR Code

# ตรวจสอบสถานะ
curl http://localhost:3000/payments/pi_xxxxxxxxxxxxx
```

---

## 📋 API Endpoints

### POST /payments/intents
สร้างรายการชำระเงินและรับ QR Code

```json
{
  "amount": 10000,
  "description": "สั่งซื้อสินค้า",
  "metadata": {
    "orderId": "12345"
  }
}
```

### GET /payments/:id
ตรวจสอบสถานะการชำระเงิน

```
GET /payments/pi_xxxxxxxxxxxxx
```

### POST /payments/webhook
รับ webhook จาก Stripe (ไม่ต้องเรียกเอง)

---

## 🔧 สถานะการชำระเงิน

| Status | ความหมาย |
|--------|----------|
| `requires_action` | รอลูกค้าสแกน QR |
| `processing` | กำลังประมวลผล |
| `succeeded` | ✅ ชำระเงินสำเร็จ |
| `canceled` | ❌ ยกเลิกแล้ว |

---

## 💡 Tips

### จำนวนเงิน
- หน่วยเป็น **สตางค์** (100 = 1 บาท)
- ตัวอย่าง: `10000` = 100.00 THB

### Metadata
ใช้เก็บข้อมูลเพิ่มเติม เช่น:
```json
{
  "metadata": {
    "orderId": "12345",
    "userId": "user_abc",
    "customField": "value"
  }
}
```

### โพลสถานะ
แนะนำโพลทุก 3-5 วินาที และหยุดเมื่อ:
- `succeeded` (สำเร็จ)
- `canceled` (ยกเลิก)
- `requires_payment_method` (ล้มเหลว)

---

## 🆘 แก้ปัญหา

### ❌ QR Code ไม่แสดง
- ตรวจสอบ `STRIPE_SECRET_KEY` ใน `.env`
- ลองใช้ Live Mode (Test Mode อาจไม่รองรับ PromptPay)

### ❌ Webhook ไม่ทำงาน
- ตรวจสอบว่าเปิด `stripe listen` ไว้
- ตรวจสอบ `STRIPE_WEBHOOK_SECRET` ถูกต้อง

### ❌ Database Error
```bash
npx prisma generate
npx prisma db push
```

---

## 📚 เอกสารเพิ่มเติม

- **[STRIPE_PROMPTPAY_README.md](./STRIPE_PROMPTPAY_README.md)** - คู่มือโดยละเอียด
- **[PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md)** - API Reference
- **[public/payment-example.html](./public/payment-example.html)** - ตัวอย่าง UI

---

## ✅ Checklist

- [x] ติดตั้ง Stripe SDK
- [x] ตั้งค่า `.env` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [x] รัน `npx prisma db push`
- [x] เปิด `stripe listen`
- [x] ทดสอบด้วยหน้าเว็บหรือ cURL

---

**หากมีคำถาม:** ดูเอกสารโดยละเอียดใน `STRIPE_PROMPTPAY_README.md` 🎉

