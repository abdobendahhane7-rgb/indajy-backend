import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PostAudience } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // HELPERS
  // =========================================================

  private requireAdmin(user: any) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Admin access required',
      );
    }
  }

  private cleanOptionalString(
    value?: string | null,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const clean = value.trim();

    if (!clean) {
      return null;
    }

    return clean;
  }

  private validatePostContent(
    text: string | null,
    imageUrl: string | null,
  ) {
    if (!text && !imageUrl) {
      throw new BadRequestException(
        'Post must contain text or image',
      );
    }
  }

  // =========================================================
  // ADMIN - CREATE POST
  // POST /posts/admin
  // =========================================================

  async createPost(
    user: any,
    dto: CreatePostDto,
  ) {
    this.requireAdmin(user);

    const text =
        this.cleanOptionalString(
      dto.text,
    );

    const imageUrl =
        this.cleanOptionalString(
      dto.imageUrl,
    );

    this.validatePostContent(
      text,
      imageUrl,
    );

    return this.prisma.post.create({
      data: {
        authorId: user.id,
        text,
        imageUrl,
        audience: dto.audience,
      },

      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  // =========================================================
  // ADMIN - GET ALL POSTS
  // GET /posts/admin
  // =========================================================

  async getAllPostsForAdmin(
    user: any,
  ) {
    this.requireAdmin(user);

    return this.prisma.post.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  // =========================================================
  // USER - GET POSTS
  // GET /posts
  //
  // FARMER:
  //   ALL + FARMER
  //
  // DISTRIBUTOR:
  //   ALL + DISTRIBUTOR
  //
  // ADMIN:
  //   ALL POSTS
  // =========================================================

  async getPostsForUser(
    user: any,
  ) {
    if (!user) {
      throw new ForbiddenException(
        'Authentication required',
      );
    }

    const role =
        String(user.role ?? '')
            .trim()
            .toUpperCase();

    // =======================================================
    // FARMER
    // =======================================================

    if (role === 'FARMER') {
      return this.prisma.post.findMany({
        where: {
          audience: {
            in: [
              PostAudience.ALL,
              PostAudience.FARMER,
            ],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });
    }

    // =======================================================
    // DISTRIBUTOR
    // =======================================================

    if (role === 'DISTRIBUTOR') {
      return this.prisma.post.findMany({
        where: {
          audience: {
            in: [
              PostAudience.ALL,
              PostAudience.DISTRIBUTOR,
            ],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });
    }

    // =======================================================
    // ADMIN
    // =======================================================

    if (role === 'ADMIN') {
      return this.prisma.post.findMany({
        orderBy: {
          createdAt: 'desc',
        },

        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });
    }

    // Unknown role
    return [];
  }

  // =========================================================
  // ADMIN - UPDATE POST
  // PATCH /posts/admin/:id
  // =========================================================

  async updatePost(
    user: any,
    postId: string,
    dto: UpdatePostDto,
  ) {
    this.requireAdmin(user);

    const existingPost =
        await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!existingPost) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    let text =
        existingPost.text;

    let imageUrl =
        existingPost.imageUrl;

    // If text was sent, update it.
    // Empty string becomes null.
    if (dto.text !== undefined) {
      text =
          this.cleanOptionalString(
        dto.text,
      );
    }

    // If imageUrl was sent, update it.
    // Empty string becomes null.
    if (dto.imageUrl !== undefined) {
      imageUrl =
          this.cleanOptionalString(
        dto.imageUrl,
      );
    }

    this.validatePostContent(
      text,
      imageUrl,
    );

    return this.prisma.post.update({
      where: {
        id: postId,
      },

      data: {
        text,
        imageUrl,

        ...(dto.audience !== undefined
            ? {
                audience:
                    dto.audience,
              }
            : {}),
      },

      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  // =========================================================
  // ADMIN - DELETE POST
  // DELETE /posts/admin/:id
  // =========================================================

  async deletePost(
    user: any,
    postId: string,
  ) {
    this.requireAdmin(user);

    const existingPost =
        await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!existingPost) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    await this.prisma.post.delete({
      where: {
        id: postId,
      },
    });

    return {
      success: true,
      message:
          'Post deleted successfully',
    };
  }
}