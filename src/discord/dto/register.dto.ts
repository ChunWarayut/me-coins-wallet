import { StringOption } from 'necord';

export class RegisterDto {
  @StringOption({
    name: 'password',
    description: 'รหัสผ่าน',
    required: true,
  })
  password: string;
}
