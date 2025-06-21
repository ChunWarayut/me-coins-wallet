# 🎁 ระบบโดเนทของขวัญ Discord

## ภาพรวม
ระบบโดเนทของขวัญช่วยให้ผู้ใช้สามารถซื้อและส่งของขวัญให้กับเจ้าของห้อง voice-stage หรือ speaker ใน Discord ได้

## คำสั่ง Discord

### `/gifts`
แสดงของขวัญทั้งหมดที่มีในระบบพร้อมปุ่มสำหรับโดเนท
- แสดงรายการของขวัญพร้อมราคา, คำอธิบาย, และหมวดหมู่
- เรียงลำดับตามราคาจากน้อยไปมาก
- **มีปุ่มสำหรับแต่ละของขวัญ** - คลิกเพื่อโดเนทได้ทันที
- แสดง 3 ปุ่มต่อแถว

### `/donate <itemId>`
โดเนทของขวัญให้กับผู้รับในห้องเสียง
- ผู้ใช้ต้องอยู่ในห้องเสียงก่อน
- ผู้รับจะเป็นคนแรกที่อยู่ในห้องเสียง (สามารถปรับแต่งได้)
- ใช้ coins จากกระเป๋าเงินของผู้ส่ง

## ระบบปุ่ม (Button System)

### การทำงานของปุ่ม
1. ผู้ใช้พิมพ์ `/gifts`
2. Bot แสดง embed พร้อมรายการของขวัญ
3. **ปุ่มแต่ละปุ่มแสดงชื่อของขวัญและราคา**
4. ผู้ใช้คลิกปุ่มเพื่อโดเนททันที
5. ระบบตรวจสอบสิทธิ์และดำเนินการโดเนท

### ตัวอย่างปุ่ม
```
[🎁 Health Potion (50 coins)] [🎁 Magic Amulet (500 coins)] [🎁 Dragon Scale Armor (800 coins)]
[🎁 Crystal Sword (1000 coins)]
```

### ข้อดีของระบบปุ่ม
- **ใช้งานง่าย** - คลิกปุ่มเดียวแทนการพิมพ์ itemId
- **ลดข้อผิดพลาด** - ไม่ต้องจำ itemId
- **UI สวยงาม** - แสดงราคาบนปุ่ม
- **รวดเร็ว** - ไม่ต้องพิมพ์คำสั่งเพิ่มเติม

## การทำงานของระบบ

### 1. การตรวจสอบสิทธิ์
- ผู้ส่งต้องลงทะเบียนและมีกระเป๋าเงิน
- ผู้รับต้องลงทะเบียนในระบบ
- ผู้ส่งต้องมี coins เพียงพอ

### 2. การประมวลผล
- สร้าง OwnedItem สำหรับผู้รับ
- สร้าง Gift record
- สร้าง Transaction record
- ลดยอดเงินในกระเป๋าของผู้ส่ง

### 3. การแจ้งเตือน
- แสดง embed สวยงามเมื่อโดเนทสำเร็จ
- แสดงรายละเอียดของขวัญ, ราคา, และผู้รับ

## การติดตั้ง

### 1. อัปเดตฐานข้อมูล
```bash
npx prisma generate
npx prisma db push
```

### 2. เพิ่มข้อมูลตัวอย่าง
```bash
npm run seed-items
```

### 3. รีจิสเตอร์คำสั่ง Discord
```bash
npm run register-commands
```

## โครงสร้างข้อมูล

### Item Model
```prisma
model Item {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String
  price       Float
  imageUrl    String?
  category    String
  rarity      ItemRarity
  ownedItems  OwnedItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum ItemRarity {
  COMMON
  RARE
  EPIC
  LEGENDARY
}
```

### Gift Flow
1. User A ใช้ `/gifts` เพื่อดูรายการของขวัญ
2. User A คลิกปุ่มของขวัญที่ต้องการ
3. ระบบตรวจสอบสิทธิ์และยอดเงิน
4. สร้าง OwnedItem สำหรับ User B (ผู้รับ)
5. สร้าง Gift record
6. สร้าง Transaction record
7. ลดยอดเงินของ User A
8. แสดงผลลัพธ์

## การปรับแต่งเพิ่มเติม

### การเลือกผู้รับ
ปัจจุบันระบบจะเลือกคนแรกที่อยู่ในห้องเสียง คุณสามารถปรับแต่งได้โดย:

1. **Stage Channel**: เลือกเจ้าของ stage
2. **Voice Channel**: เลือกผู้พูด (speaker)
3. **Custom Logic**: สร้างระบบเลือกผู้รับแบบ interactive

### การเพิ่มฟีเจอร์
- ระบบเลือกผู้รับแบบ interactive
- การแสดงประวัติการโดเนท
- ระบบ ranking ของผู้โดเนท
- การแจ้งเตือนผ่าน webhook
- ปุ่มยืนยันก่อนโดเนท
- ระบบเลือกจำนวนของขวัญ

## ตัวอย่างการใช้งาน

### วิธีที่ 1: ใช้ปุ่ม (แนะนำ)
```
User A: /gifts
Bot: แสดงรายการของขวัญพร้อมปุ่ม

User A: คลิกปุ่ม [🎁 Crystal Sword (1000 coins)]
Bot: โดเนท Crystal Sword ให้ User B สำเร็จ!
```

### วิธีที่ 2: ใช้คำสั่ง (แบบเดิม)
```
User A: /donate 507f1f77bcf86cd799439041
Bot: โดเนท Crystal Sword ให้ User B สำเร็จ!
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย
1. **"คุณต้องอยู่ในห้องเสียงก่อน"** - ผู้ใช้ต้องเข้า voice channel ก่อน
2. **"คุณมีเงินไม่เพียงพอ"** - ต้องมี coins มากกว่าหรือเท่ากับราคาของขวัญ
3. **"ผู้รับของขวัญยังไม่ได้ลงทะเบียน"** - ผู้รับต้องใช้ `/register` ก่อน
4. **ปุ่มไม่ทำงาน** - ตรวจสอบ Discord permissions และ bot intents

### การ Debug
- ตรวจสอบ logs ใน console
- ตรวจสอบฐานข้อมูลว่าข้อมูลถูกบันทึกถูกต้อง
- ตรวจสอบ Discord permissions
- ตรวจสอบ Button intents ใน Discord Developer Portal

## เทคนิคการพัฒนา

### Button Custom ID
- รูปแบบ: `donate_<itemId>`
- ตัวอย่าง: `donate_507f1f77bcf86cd799439041`

### Button Styling
- **Primary Style**: สำหรับปุ่มโดเนท
- **Emoji**: 🎁 สำหรับทุกปุ่ม
- **Label**: แสดงชื่อของขวัญและราคา

### Error Handling
- ตรวจสอบ voice channel membership
- ตรวจสอบ wallet balance
- ตรวจสอบ user registration
- แสดงข้อความ error ที่ชัดเจน