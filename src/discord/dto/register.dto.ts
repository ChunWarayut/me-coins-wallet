import { StringOption } from 'necord';

export class RegisterDto {
  @StringOption({
    name: 'username',
    description: 'ชื่อผู้ใช้งาน',
    required: true,
  })
  username: string;

  @StringOption({
    name: 'password',
    description: 'รหัสผ่าน',
    required: true,
  })
  password: string;
}
