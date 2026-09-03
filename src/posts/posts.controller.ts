import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreatePostDto } from './dto/create-post.dto';

import { UpdatePostDto } from './dto/update-post.dto';

import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
  ) {}

  // =========================================================
  // ADMIN - CREATE
  // POST /posts/admin
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Post('admin')
  createPost(
    @CurrentUser() user: any,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(
      user,
      dto,
    );
  }

  // =========================================================
  // ADMIN - GET ALL
  // GET /posts/admin
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  getAllForAdmin(
    @CurrentUser() user: any,
  ) {
    return this.postsService.getAllPostsForAdmin(
      user,
    );
  }

  // =========================================================
  // ADMIN - UPDATE
  // PATCH /posts/admin/:id
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id')
  updatePost(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(
      user,
      id,
      dto,
    );
  }

  // =========================================================
  // ADMIN - DELETE
  // DELETE /posts/admin/:id
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Delete('admin/:id')
  deletePost(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.postsService.deletePost(
      user,
      id,
    );
  }

  // =========================================================
  // FARMER / DISTRIBUTOR FEED
  // GET /posts
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyPosts(
    @CurrentUser() user: any,
  ) {
    return this.postsService.getPostsForUser(
      user,
    );
  }
}