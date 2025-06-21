import { IsString } from 'class-validator';
import { StringOption } from 'necord';

export class DonateDto {
  @StringOption({
    name: 'item',
    description: 'รหัสของขวัญที่ต้องการโดเนท',
    required: true,
  })
  @IsString()
  itemId: string;
}
