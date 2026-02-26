import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * Payload for POST /auth/login.
 *
 * Validation is intentionally minimal here: we do not re-enforce password
 * complexity rules because the error message "invalid credentials" is safer
 * than "password must contain uppercase" (which leaks policy information to
 * an attacker enumerating accounts).
 */
export class LoginDto {
  @IsEmail({}, { message: 'email must be a valid e-mail address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'password must not be empty' })
  password: string;
}