import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

// Define the payload type
interface JwtPayload {
  id: string;
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'defaultSecretKey',
    });
  }

  async validate(payload: JwtPayload) {
    console.log('JWT Strategy - Full payload:', payload);
    console.log('JWT Strategy - Using id:', payload.id);
    const user = await this.authService.validateUser(payload.id);
    console.log('JWT Strategy - Found user:', user);
    if (!user) {
      console.log('JWT Strategy - No user found, throwing Unauthorized');
      throw new UnauthorizedException();
    }
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  }
}
