import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export enum ManagementType {
  WEG = 'WEG',
  MV = 'MV',
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}-\d{3}-[A-Z]{3}$/, {
    message: 'object_number must match format XX-XXX-XXX (e.g. 10-557-PRB)',
  })
  object_number: string;

  @IsEnum(ManagementType)
  management_type: ManagementType;

  @IsOptional()
  @IsString()
  property_manager_name?: string;

  @IsOptional()
  @IsString()
  property_manager_company?: string;

  @IsOptional()
  @IsString()
  accountant_name?: string;

  @IsOptional()
  @IsString()
  accountant_company?: string;
}
