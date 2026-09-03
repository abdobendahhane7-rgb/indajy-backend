import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  PostAudience,
  UserRole,
} from "@prisma/client";

import {
  PrismaService,
} from "../prisma/prisma.service";

import {
  CreatePostDto,
} from "./dto/create-post.dto";

import {
  UpdatePostDto,
} from "./dto/update-post.dto";

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  private async requireAdmin(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    if (
      user.role !==
      UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Only admin can manage posts",
      );
    }

    return user;
  }

  // =========================================================
  // NORMALIZE OPTIONAL TEXT
  // =========================================================

  private cleanOptionalString(
    value?: string | null,
    ): string | null {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

  const clean = String(value).trim();

  return clean.length === 0
    ? null
    : clean;
}
  // =========================================================
  // CREATE POST
  // =========================================================

  async createPost(
    userId: string,
    dto: CreatePostDto,
  ) {
    await this.requireAdmin(
      userId,
    );

    const text =
      this.cleanOptionalString(
        dto.text,
      );

    const imageUrl =
      this.cleanOptionalString(
        dto.imageUrl,
      );

    // Post ma y9derch ykon khawi
    if (
      !text &&
      !imageUrl
    ) {
      throw new BadRequestException(
        "Post must contain text or image",
      );
    }

    return this.prisma.post.create({
      data: {
        authorId:
          userId,

        text,

        imageUrl,

        audience:
          dto.audience,
      },

      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  // =========================================================
  // ADMIN - GET ALL POSTS
  // =========================================================

  async getAllPostsForAdmin(
    userId: string,
  ) {
    await this.requireAdmin(
      userId,
    );

    return this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });
  }

  // =========================================================
  // USER FEED
  // =========================================================

  async getPostsForUser(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id:
            userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // =======================================================
    // FARMER
    // ALL + FARMER
    // =======================================================

    if (
      user.role ===
      UserRole.FARMER
    ) {
      return this.prisma.post.findMany({
        where: {
          audience: {
            in: [
              PostAudience.ALL,
              PostAudience.FARMER,
            ],
          },
        },

        select: {
          id: true,
          text: true,
          imageUrl: true,
          audience: true,
          createdAt: true,
          updatedAt: true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });
    }

    // =======================================================
    // DISTRIBUTOR
    // ALL + DISTRIBUTOR
    // =======================================================

    if (
      user.role ===
      UserRole.DISTRIBUTOR
    ) {
      return this.prisma.post.findMany({
        where: {
          audience: {
            in: [
              PostAudience.ALL,
              PostAudience.DISTRIBUTOR,
            ],
          },
        },

        select: {
          id: true,
          text: true,
          imageUrl: true,
          audience: true,
          createdAt: true,
          updatedAt: true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });
    }

    // =======================================================
    // ADMIN
    // Can see everything
    // =======================================================

    if (
      user.role ===
      UserRole.ADMIN
    ) {
      return this.prisma.post.findMany({
        orderBy: {
          createdAt:
            "desc",
        },
      });
    }

    // DRIVER currently ma 3ndoch posts
    return [];
  }

  // =========================================================
  // UPDATE POST
  // =========================================================

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ) {
    await this.requireAdmin(
      userId,
    );

    const post =
      await this.prisma.post.findUnique({
        where: {
          id:
            postId,
        },
      });

    if (!post) {
      throw new NotFoundException(
        "Post not found",
      );
    }

    // =======================================================
    // CALCULATE FINAL CONTENT
    // =======================================================

    const nextText =
      dto.text !== undefined
        ? this.cleanOptionalString(
            dto.text,
          )
        : post.text;

    const nextImageUrl =
      dto.imageUrl !== undefined
        ? this.cleanOptionalString(
            dto.imageUrl,
          )
        : post.imageUrl;

    // Ma nkhelliwch post khawi
    if (
      !nextText &&
      !nextImageUrl
    ) {
      throw new BadRequestException(
        "Post must contain text or image",
      );
    }

    return this.prisma.post.update({
      where: {
        id:
          postId,
      },

      data: {
        text:
          nextText,

        imageUrl:
          nextImageUrl,

        audience:
          dto.audience ??
          post.audience,
      },

      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  // =========================================================
  // DELETE POST
  // =========================================================

  async deletePost(
    userId: string,
    postId: string,
  ) {
    await this.requireAdmin(
      userId,
    );

    const post =
      await this.prisma.post.findUnique({
        where: {
          id:
            postId,
        },
      });

    if (!post) {
      throw new NotFoundException(
        "Post not found",
      );
    }

    await this.prisma.post.delete({
      where: {
        id:
          postId,
      },
    });

    return {
      message:
        "Post deleted successfully",
    };
  }
}