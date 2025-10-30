# React + Vite Frontend - Payment UI

ระบบหน้าบ้านสำหรับ Payment System ที่ใช้ React + Vite

## 🚀 การใช้งาน

### Development (แยกพอร์ต)

```bash
# Terminal 1: รัน NestJS Backend
npm run start:dev   # Port 3000

# Terminal 2: รัน React Frontend
cd frontend
npm install
npm run dev         # Port 5173
```

เปิดเว็บ: `http://localhost:5173`

### Production (พอร์ตเดียว - รวมกับ NestJS)

```bash
# Build React
cd frontend
npm run build

# Copy build ไปยัง backend
cp -r dist/* ../public/

# Run NestJS (จะ serve ทั้ง frontend + API)
cd ..
npm run start:prod

# เปิดเว็บ: http://localhost:3000
```

## 📁 โครงสร้าง

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.tsx           # หน้าหลัก (สร้าง payment)
│   │   ├── Payment.tsx        # หน้าชำระเงิน (QR + polling)
│   │   ├── Success.tsx        # หน้า success callback
│   │   └── Cancel.tsx         # หน้า cancel callback
│   ├── api/
│   │   └── payments.ts        # API client
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── index.html
├── vite.config.ts             # Vite config (proxy)
├── tsconfig.json
└── package.json
```

## 🎨 Features

- ✅ **React 18** - Latest features (hooks, concurrent)
- ✅ **TypeScript** - Type-safe
- ✅ **React Router** - Client-side routing
- ✅ **Vite** - ⚡ Lightning fast HMR
- ✅ **Vite Proxy** - ไม่ติด CORS ใน dev mode
- ✅ **Auto-polling** - เช็คสถานะทุก 3 วินาที
- ✅ **Callback System** - Redirect พร้อม parameters
- ✅ **Responsive Design** - รองรับทุกหน้าจอ

## 🔧 Configuration

### Vite Proxy (Development)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/payments': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

## 📝 API Endpoints (ผ่าน proxy)

- `POST /payments/intents` - สร้าง Payment Intent
- `GET /payments/:id` - ดึงสถานะ payment

## 🎯 Routes

| Path | Description |
|------|-------------|
| `/` | หน้าหลัก - สร้าง payment |
| `/payment/:id` | หน้าชำระเงิน - แสดง QR |
| `/success` | Callback success |
| `/cancel` | Callback cancel |

## 💡 Tips

- ใช้ Vite proxy เพื่อไม่ต้องตั้ง CORS ใน dev
- Build แล้ว serve จาก NestJS สำหรับ production
- React Router ใช้ BrowserRouter (ต้องตั้ง fallback ใน NestJS)

## 🚀 Deploy

1. Build: `npm run build`
2. Copy `dist/*` ไป NestJS `public/`
3. NestJS ต้อง serve SPA fallback (index.html) สำหรับทุก route
