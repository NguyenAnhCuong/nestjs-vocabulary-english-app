// src/topics/topics.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTopicDto) {
    const exists = await this.prisma.topic.findUnique({
      where: { name: dto.name },
    });
    if (exists)
      throw new BadRequestException(`Chủ đề "${dto.name}" đã tồn tại!`);

    return this.prisma.topic.create({ data: dto });
  }

  async findAll(current = 1, pageSize = 10, onlyActive = false) {
    const where = onlyActive ? { isActive: true } : {};
    const skip = (current - 1) * pageSize;

    const [total, result] = await Promise.all([
      this.prisma.topic.count({ where }),
      this.prisma.topic.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { wordTopics: true } },
        },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result: result.map((t) => ({ ...t, wordCount: t._count.wordTopics })),
    };
  }

  async findOne(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        wordTopics: {
          include: {
            word: {
              select: {
                id: true,
                en: true,
                phonetic: true,
                type: true,
                level: true,
                meaning: true,
              },
            },
          },
        },
        _count: { select: { wordTopics: true } },
      },
    });
    if (!topic) throw new BadRequestException('Topic không tồn tại!');
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto) {
    await this.findOne(id);
    return this.prisma.topic.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.topic.delete({ where: { id } });
  }

  // Gán từ vào chủ đề (batch)
  async assignWords(topicId: string, wordIds: string[]) {
    await this.findOne(topicId);
    // upsert để không bị duplicate
    const data = wordIds.map((wordId) => ({ wordId, topicId }));
    return this.prisma.wordTopic.createMany({ data, skipDuplicates: true });
  }

  // Xoá từ khỏi chủ đề (batch)
  async removeWords(topicId: string, wordIds: string[]) {
    return this.prisma.wordTopic.deleteMany({
      where: { topicId, wordId: { in: wordIds } },
    });
  }
}
