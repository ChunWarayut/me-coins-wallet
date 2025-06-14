import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: registerDto.email }, { username: registerDto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Generate unique account number
    let accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000,
    ).toString();
    let isUnique = false;

    while (!isUnique) {
      const existingAccount = await this.prisma.user.findFirst({
        where: {
          accountNumber,
        },
      });
      if (!existingAccount) {
        isUnique = true;
      } else {
        accountNumber = Math.floor(
          1000000000 + Math.random() * 9000000000,
        ).toString();
      }
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        discordId: registerDto.discordId,
        username: registerDto.username,
        password: hashedPassword,
        avatar: registerDto.avatar || '/avatar.png',
        accountNumber,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    // Generate JWT
    const token = this.generateToken({
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: {
        username: loginDto.username,
      },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = this.generateToken({
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        balance: user.wallet?.balance,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  generateToken(payload: {
    id: string;
    sub: string;
    email: string;
    role: string;
  }) {
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    console.log('Auth Service - Validating user with ID:', userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    console.log('Auth Service - Found user:', user);
    return user;
  }
}
