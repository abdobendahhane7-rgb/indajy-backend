import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      success: true,
      message: 'InDajy API is running 🚀',
      version: '1.0.0',
    };
  }
}
