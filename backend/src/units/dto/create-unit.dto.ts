import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UnitType {
  apartment = 'apartment',
  office = 'office',
  garden = 'garden',
  parking = 'parking',
}

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @IsEnum(UnitType)
  type: UnitType;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  entrance?: string;

  @IsNotEmpty()
  size_sqm: number | string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?\/\d+$/, {
    message: 'co_ownership_share must match format "110.0/1000"',
  })
  co_ownership_share: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  construction_year?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rooms?: number;
}

export class BulkCreateUnitsDto {
  units: CreateUnitDto[];
}
