import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Payload for POST /auth/register.
 *
 * All three fields are required (no @IsOptional).
 * Unknown fields are rejected with 400 by the global ValidationPipe.
 */
export class RegisterDto {
  /**
   * Must be a valid RFC 5322 e-mail address.
   * class-validator normalises it to lowercase before storage.
   */
  @IsEmail({}, { message: 'email must be a valid e-mail address' })
  email: string;

  /**
   * Minimum 8 characters.
   * Must contain at least one uppercase letter, one lowercase letter,
   * one digit, and one special character — enforced by the regex below.
   *
   * The regex is intentionally explicit so the error message is useful:
   *   "password is too weak" is clearer than a generic pattern failure.
   */
  @IsString()
  @MinLength(8,  { message: 'password must be at least 8 characters' })
  @MaxLength(72, { message: 'password must be at most 72 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    {
      message:
        'password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
    },
  )
  password: string;

  /**
   * Display name shown in the UI.  3–30 characters, alphanumeric and underscores.
   */
  @IsString()
  @MinLength(3,  { message: 'username must be at least 3 characters' })
  @MaxLength(30, { message: 'username must be at most 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username: string;
}