import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/entities/user.entity';
import { JwtPayload, RequestUser } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Fetch the user from the database to get latest role and validate existence
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new Error('User not found');
    }

    // Return canonical RequestUser shape
    return {
      id: payload.sub, // Canonical ID field
      username: payload.username,
      email: payload.email,
      role: user?.role || UserRole.USER,
    };
  }
}
