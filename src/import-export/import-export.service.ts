// src/import-export/import-export.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IUser } from 'src/common/interfaces';
import { WordType, CefrLevel } from '@prisma/client';

interface WordRow {
  en: string;
  phonetic?: string;
  type?: string;
  level?: string;
  meaning: string;
  example?: string;
  note?: string;
}

@Injectable()
export class ImportExportService {
  constructor(private prisma: PrismaService) {}

  // Tạo log record
  private async createLog(
    userId: string,
    direction: 'import' | 'export',
    format: string,
    fileName?: string,
  ) {
    return this.prisma.importExport.create({
      data: { userId, direction, format, fileName, status: 'processing' },
    });
  }

  // Export từ cá nhân của user ra JSON
  async exportUserWords(userId: string) {
    const log = await this.createLog(userId, 'export', 'json');

    const words = await this.prisma.userWord.findMany({
      where: { userId, isDeleted: false },
      select: {
        en: true,
        phonetic: true,
        type: true,
        level: true,
        meaning: true,
        example: true,
        note: true,
        source: true,
        createdAt: true,
      },
    });

    await this.prisma.importExport.update({
      where: { id: log.id },
      data: { status: 'done', wordCount: words.length },
    });

    return {
      exportedAt: new Date().toISOString(),
      wordCount: words.length,
      words,
    };
  }

  // Import từ JSON array vào UserWord của user
  async importUserWords(userId: string, rows: WordRow[], fileName?: string) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Dữ liệu import không hợp lệ!');
    }

    const log = await this.createLog(userId, 'import', 'json', fileName);

    const validWordTypes = Object.values(WordType);
    const validLevels = Object.values(CefrLevel);

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.en || !row.meaning) {
        errors.push(`Bỏ qua "${row.en ?? '?'}": thiếu en hoặc meaning`);
        continue;
      }

      // Check trùng
      const exists = await this.prisma.userWord.findFirst({
        where: { userId, en: row.en, isDeleted: false },
      });
      if (exists) {
        errors.push(`Bỏ qua "${row.en}": đã tồn tại`);
        continue;
      }

      const type = validWordTypes.includes(row.type as WordType)
        ? (row.type as WordType)
        : 'NOUN';
      const level = validLevels.includes(row.level as CefrLevel)
        ? (row.level as CefrLevel)
        : 'B1';

      const userWord = await this.prisma.userWord.create({
        data: {
          userId,
          en: row.en,
          phonetic: row.phonetic,
          type,
          level,
          meaning: row.meaning,
          example: row.example,
          note: row.note,
          source: 'IMPORT',
        },
      });

      // Tạo WordProgress
      await this.prisma.wordProgress.create({
        data: {
          userId,
          userWordId: userWord.id,
          source: 'IMPORT',
          status: 'NEW',
        },
      });

      imported++;
    }

    await this.prisma.importExport.update({
      where: { id: log.id },
      data: {
        status: errors.length > 0 && imported === 0 ? 'failed' : 'done',
        wordCount: imported,
        errorLog: errors.length > 0 ? errors.join('\n') : null,
      },
    });

    return {
      imported,
      skipped: rows.length - imported,
      errors,
    };
  }

  async getHistory(userId: string, current = 1, pageSize = 10) {
    const skip = (current - 1) * pageSize;
    const where = { userId };

    const [total, result] = await Promise.all([
      this.prisma.importExport.count({ where }),
      this.prisma.importExport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result,
    };
  }
}
