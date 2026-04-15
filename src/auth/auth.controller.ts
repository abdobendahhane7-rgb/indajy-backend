import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  async register(
    @Body()
    body: {
      fullName: string;
      phone: string;
      email?: string;
      password: string;
      city?: string;
      role: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post("login")
  async login(
    @Body()
    body: {
      phone: string;
      password: string;
    },
  ) {
    return this.authService.login(
      body.phone,
      body.password,
    );
  }
}