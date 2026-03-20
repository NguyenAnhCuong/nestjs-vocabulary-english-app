// src/user-words/user-words.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserWordDto } from './dto/create-user-word.dto';
import { PartialType } from '@nestjs/mapped-types';
import type { IUser } from 'src/common/interfaces';

class UpdateUserWordDto extends PartialType(CreateUserWordDto) {}

@Injectable()
export class UserWordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserWordDto, user: IUser) {
    // Không cho trùng từ trong danh sách riêng của cùng 1 user
    const exists = await this.prisma.userWord.findFirst({
      where: { userId: user.id, en: dto.en, isDeleted: false },
    });
    if (exists) {
      throw new BadRequestException(`Bạn đã thêm từ "${dto.en}" rồi!`);
    }

    const userWord = await this.prisma.userWord.create({
      data: { ...dto, userId: user.id },
    });

    // Tự động tạo WordProgress cho từ mới
    await this.prisma.wordProgress.create({
      data: {
        userId: user.id,
        userWordId: userWord.id,
        source: 'MANUAL',
        status: 'NEW',
      },
    });

    return userWord;
  }

  async findAll(userId: string, current = 1, pageSize = 10, sort = 'newest') {
    const skip = (current - 1) * pageSize;
    const where = { userId, isDeleted: false };

    const orderBy: any =
      sort === 'az'
        ? { en: 'asc' }
        : sort === 'za'
          ? { en: 'desc' }
          : { createdAt: 'desc' };

    const [total, result] = await Promise.all([
      this.prisma.userWord.count({ where }),
      this.prisma.userWord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          wordProgress: {
            select: {
              status: true,
              nextReviewAt: true,
              correctCount: true,
              wrongCount: true,
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

  async findOne(id: string, userId: string) {
    const word = await this.prisma.userWord.findFirst({
      where: { id, userId, isDeleted: false },
      include: { wordProgress: true },
    });
    if (!word) throw new BadRequestException('Từ không tồn tại!');
    return word;
  }

  async update(id: string, dto: UpdateUserWordDto, user: IUser) {
    await this.findOne(id, user.id);
    return this.prisma.userWord.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: IUser) {
    await this.findOne(id, user.id);
    return this.prisma.userWord.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
