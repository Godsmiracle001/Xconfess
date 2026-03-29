import { IsOptional, IsEmail, IsNumber, ValidateIf } from 'class-validator';

export class ForgotPasswordDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ValidateIf((o) => !o.userId || o.email)
  email?: string;

  @IsOptional()
  @IsNumber({}, { message: 'User ID must be a number' })
  @ValidateIf((o) => !o.email || o.userId)
  userId?: number;

  // Custom validation to ensure at least one field is provided
  static validate(dto: ForgotPasswordDto): boolean {
    return !!(dto.email || dto.userId);
  }
}
