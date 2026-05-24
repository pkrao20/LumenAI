import { Body, Controller, Post } from '@nestjs/common';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from './users.service';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.usersService.signup(dto);
  }

  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.usersService.signin(dto);
  }
}
