import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RequestStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
