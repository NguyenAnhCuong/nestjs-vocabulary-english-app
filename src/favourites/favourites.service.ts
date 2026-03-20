// src/favourites/favourites.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IUser } from 'src/common/interfaces';
import { IsOptional, IsString } from 'class-validator';

export class ToggleFavDto {
  @IsOptional()
  @IsString()
  wordId?: string;

  @IsOptional()
  @IsString()
  userWordId?: string;
}

@Injectable()
export class FavouritesService {
  constructor(private prisma: PrismaService) {}

  async toggle(dto: ToggleFavDto, userId: string) {
    const { wordId, userWordId } = dto;
    if (!wordId && !userWordId) {
      throw new BadRequestException('Cần cung cấp wordId hoặc userWordId!');
    }

    const where: any = { userId };
    if (wordId) where.wordId = wordId;
    if (userWordId) where.userWordId = userWordId;

    const existing = await this.prisma.favourite.findFirst({ where });

    if (existing) {
      await this.prisma.favourite.delete({ where: { id: existing.id } });
      return { isFavourite: false };
    }

    await this.prisma.favourite.create({
      data: { userId, wordId, userWordId },
    });
    return { isFavourite: true };
  }

  async findAll(userId: string, current = 1, pageSize = 20) {
    const skip = (current - 1) * pageSize;
    const where = { userId };

    const [total, result] = await Promise.all([
      this.prisma.favourite.count({ where }),
      this.prisma.favourite.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          word: {
            select: {
              id: true,
              en: true,
              phonetic: true,
              type: true,
              level: true,
              meaning: true,
              example: true,
              wordTopics: {
                include: {
                  topic: { select: { name: true, emoji: true, color: true } },
                },
              },
            },
          },
          userWord: {
            select: {
              id: true,
              en: true,
              phonetic: true,
              type: true,
              level: true,
              meaning: true,
              note: true,
            },
          },
        },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result,
    };
  }

  async checkIsFavourite(userId: string, wordId?: string, userWordId?: string) {
    const where: any = { userId };
    if (wordId) where.wordId = wordId;
    if (userWordId) where.userWordId = userWordId;
    const fav = await this.prisma.favourite.findFirst({ where });
    return { isFavourite: !!fav };
  }
}
