import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { compareSync, genSaltSync, hashSync } from 'bcrypt';
import { IUser } from './users.controller';
import { Role } from '../generated/prisma/enums';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getHashPassword(password: string): string {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  }

  async create(data: CreateUserDto, user: IUser) {
    const { email, password, name } = data;

    if (!email) {
      throw new BadRequestException('Email không được để trống!');
    }
    if (!password) {
      throw new BadRequestException('Password không được để trống!');
    }

    const isExist = await this.prisma.user.findUnique({ where: { email } });
    if (isExist) {
      throw new BadRequestException(`Email ${email} đã tồn tại!`);
    }

    const hashPassword = this.getHashPassword(password);

    return await this.prisma.user.create({
      data: {
        email,
        password: hashPassword,
        name,
        role: Role.USER, // Sử dụng Enum từ Prisma Client
        isDeleted: false, // Giá trị mặc định
        createdBy: {
          id: user.id,
          email: user.email,
        } as any,
      },
    });
  }

  // src/users/users.service.ts
  async upsertGoogleUser(data: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
  }) {
    return await this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        googleId: data.googleId, // Cập nhật ID Google nếu có thay đổi
        name: data.name,
      },
      create: {
        email: data.email,
        name: data.name,
        googleId: data.googleId,
        password: null, // User Google không có mật khẩu local
        role: Role.USER,
        provider: 'GOOGLE', // Để biết user này đến từ đâu
        avatarUrl: data.avatarUrl,
        createdBy: { id: data.googleId, email: data.email } as any,
      },
    });
  }

  async findAll(currentPage: number, limit: number, queryString: string) {
    const skip = (currentPage - 1) * limit;

    // Lưu ý: Logic filter phức tạp của api-query-params
    // cần được parse sang Prisma where object. Ở đây tôi làm mẫu find đơn giản.
    const where = { isDeleted: false };

    const [totalItems, result] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          gender: true,
          age: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
    if (!user) throw new BadRequestException('User not found');

    const { password, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        role: updateUserDto.role ? (updateUserDto.role as Role) : undefined,
        updatedBy: {
          id: user.id,
          email: user.email,
        } as any,
      },
    });
  }

  async remove(id: string, user: IUser) {
    const foundUser = await this.prisma.user.findUnique({ where: { id } });

    if (!foundUser) throw new BadRequestException('User not found');
    if (foundUser.email === 'admin@gmail.com') {
      throw new BadRequestException('Cannot delete admin account');
    }

    // Soft delete thực tế là Update
    return await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: {
          id: user.id,
          email: user.email,
        } as any,
      },
    });
  }

  async findOneByUsername(username: string) {
    return await this.prisma.user.findUnique({ where: { email: username } });
  }

  checkUserPassword(hashPassword: string, password: string): boolean {
    return compareSync(password, hashPassword);
  }

  updateUserToken = async (refreshToken: string, id: string) => {
    return await this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  };
}
