import { NumberOption, StringOption } from 'necord';

export class TransferDto {
  @StringOption({
    name: 'receiver-account-number',
    description: 'รหัสบัญชีธนาคารของผู้รับ',
    required: true,
  })
  receiverAccountNumber: string;

  @NumberOption({
    name: 'amount',
    description: 'จำนวนเงินที่จะโอน',
    required: true,
  })
  amount: number;

  @StringOption({
    name: 'comment',
    description: 'หมายเหตุ',
    required: false,
  })
  comment?: string;
}
