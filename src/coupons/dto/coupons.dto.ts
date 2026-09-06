import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsIn,
  Min,
} from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  orderAmount: number;
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0.01)
  value: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minSpend?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsString()
  @IsNotEmpty()
  expiryDate: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'expired'])
  status?: string;
}

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  type?: 'percentage' | 'fixed';

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  value?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minSpend?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'expired'])
  status?: string;
}
