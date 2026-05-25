import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from './users.service';

const COOKIE_NAME = 'access_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.usersService.signup(dto);
    res.cookie(COOKIE_NAME, access_token, COOKIE_OPTIONS);
    return { message: 'Signed up successfully' };
  }

  @Post('signin')
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.usersService.signin(dto);
    res.cookie(COOKIE_NAME, access_token, COOKIE_OPTIONS);
    return { message: 'Signed in successfully' };
  }
}
