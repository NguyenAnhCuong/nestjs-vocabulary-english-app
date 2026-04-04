// src/words/words.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { FilterWordDto } from './dto/update-word.dto';
import { CefrLevel } from '../generated/prisma/enums';

@Injectable()
export class WordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWordDto) {
    const { topicIds, ...wordData } = dto;

    const exists = await this.prisma.word.findUnique({
      where: { en: wordData.en },
    });
    if (exists)
      throw new BadRequestException(`Từ "${wordData.en}" đã tồn tại!`);

    return this.prisma.word.create({
      data: {
        ...wordData,
        tags: wordData.tags ?? [],
        wordTopics: topicIds?.length
          ? { create: topicIds.map((topicId) => ({ topicId })) }
          : undefined,
      },
      include: { wordTopics: { include: { topic: true } } },
    });
  }

  async findAll(filter: FilterWordDto) {
    const { current = 1, pageSize = 10, level, type, topicId, search } = filter;
    const skip = (current - 1) * pageSize;

    const where: any = { isActive: true };
    if (level) where.level = level;
    if (type) where.type = type;
    if (search) where.en = { contains: search, mode: 'insensitive' };
    if (topicId) {
      where.wordTopics = { some: { topicId } };
    }

    const [total, result] = await Promise.all([
      this.prisma.word.count({ where }),
      this.prisma.word.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ level: 'asc' }, { en: 'asc' }],
        include: {
          wordTopics: {
            include: {
              topic: {
                select: { id: true, name: true, emoji: true, color: true },
              },
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

  async findOne(id: string) {
    const word = await this.prisma.word.findUnique({
      where: { id },
      include: {
        wordTopics: { include: { topic: true } },
      },
    });
    if (!word) throw new BadRequestException('Từ không tồn tại!');
    return word;
  }

  async update(id: string, dto: UpdateWordDto) {
    const { topicIds, ...wordData } = dto;
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Nếu có cập nhật topic thì xoá hết rồi tạo lại
      if (topicIds !== undefined) {
        await tx.wordTopic.deleteMany({ where: { wordId: id } });
        if (topicIds.length > 0) {
          await tx.wordTopic.createMany({
            data: topicIds.map((topicId) => ({ wordId: id, topicId })),
          });
        }
      }
      return tx.word.update({
        where: { id },
        data: wordData,
        include: { wordTopics: { include: { topic: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete bằng cách set isActive = false
    return this.prisma.word.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Lấy từ theo cấp độ, có đếm số user đã học (dùng cho admin stats)
  async getWordsByLevel(level: CefrLevel) {
    return this.prisma.word.findMany({
      where: { level, isActive: true },
      include: {
        _count: { select: { wordProgress: true } },
        wordTopics: {
          include: { topic: { select: { name: true, emoji: true } } },
        },
      },
      orderBy: { en: 'asc' },
    });
  }

  // Lấy từ cần ôn hôm nay cho user (nextReviewAt <= now)
  async getDueWordsForUser(userId: string, limit = 20) {
    const progresses = await this.prisma.wordProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        status: { not: 'MASTERED' },
      },
      take: limit,
      orderBy: { nextReviewAt: 'asc' },
      include: {
        word: true,
        userWord: true,
      },
    });
    return progresses;
  }

  // Thêm vào WordsService
  async bulkCreate(rows: CreateWordDto[]) {
    const results = {
      created: 0,
      restored: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const dto of rows) {
      try {
        const { topicIds, ...wordData } = dto;

        const existing = await this.prisma.word.findUnique({
          where: { en: wordData.en },
          include: { wordTopics: true },
        });

        if (existing) {
          if (!existing.isActive) {
            // ── Từ đã soft-delete → khôi phục + cập nhật dữ liệu mới + gán lại topics
            await this.prisma.$transaction(async (tx) => {
              // Xoá hết topic cũ rồi gán topic mới (nếu có)
              await tx.wordTopic.deleteMany({ where: { wordId: existing.id } });

              if (topicIds && topicIds.length > 0) {
                await tx.wordTopic.createMany({
                  data: topicIds.map((topicId) => ({
                    wordId: existing.id,
                    topicId,
                  })),
                  skipDuplicates: true,
                });
              }

              await tx.word.update({
                where: { id: existing.id },
                data: {
                  ...wordData,
                  tags: wordData.tags ?? existing.tags,
                  isActive: true, // ← khôi phục
                },
              });
            });

            results.restored++;
          } else {
            // Từ đang active → bỏ qua
            results.skipped++;
            results.errors.push(`Bỏ qua "${wordData.en}": từ đã tồn tại`);
          }
          continue;
        }

        // ── Từ chưa tồn tại → tạo mới
        await this.prisma.word.create({
          data: {
            ...wordData,
            tags: wordData.tags ?? [],
            wordTopics:
              topicIds && topicIds.length > 0
                ? { create: topicIds.map((topicId) => ({ topicId })) }
                : undefined,
          },
        });
        results.created++;
      } catch (e: any) {
        results.skipped++;
        results.errors.push(`Lỗi "${dto.en}": ${e.message}`);
      }
    }

    return results;
  }
}
