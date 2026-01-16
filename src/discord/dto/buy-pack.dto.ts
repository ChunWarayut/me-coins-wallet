import { NumberOption } from 'necord';

export class BuyPackDto {
  @NumberOption({
    name: 'pack',
    description: 'หมายเลขแพ็คที่ต้องการซื้อ (1-10)',
    required: true,
    min_value: 1,
    max_value: 10,
  })
  pack: number;
}

