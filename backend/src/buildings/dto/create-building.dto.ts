import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  house_number: string;

  @IsOptional()
  @IsString()
  additional_info?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  construction_year?: number;
}
