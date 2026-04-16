import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      success: true,
      message: "InDajy API is running 🚀",
    };
  }

  @Get("health")
  getHealth() {
    return {
      status: "ok",
    };
  }
}