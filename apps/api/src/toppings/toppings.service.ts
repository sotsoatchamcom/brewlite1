import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryToppingDto } from './dto/query-topping.dto';

@Injectable()
export class ToppingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    const existing = await this.prisma.topping.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Tên topping đã tồn tại!');
    }

    const { categoryIds, ...data } = dto;

    return this.prisma.topping.create({
      data: {
        ...data,
        categories: categoryIds && categoryIds.length > 0
            ? { connect: categoryIds.map((id: number) => ({ id: Number(id) })) }
            : undefined,
      },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findAll(query: QueryToppingDto, includeHidden: boolean = false) {
    const { search, categoryId, page, limit } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (!includeHidden) {
      whereCondition.isAvailable = true;
    }

    if (search) {
      whereCondition.name = { contains: search, mode: 'insensitive' };
    }

    // Nếu truyền categoryId thì chỉ lấy các Topping được gán danh mục này
    if (categoryId) {
      whereCondition.categories = {
        some: { id: Number(categoryId) },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.topping.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          categories: {
            select: { id: true, name: true },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.topping.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, includeHidden: boolean = false) {
    const topping = await this.prisma.topping.findUnique({
      where: { id },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });

    if (!topping || (!topping.isAvailable && !includeHidden)) {
      throw new NotFoundException(
          `Không tìm thấy topping ID ${id} hoặc đã ngừng bán`,
      );
    }
    return topping;
  }

  async update(id: number, dto: any) {
    await this.findOne(id, true);

    if (dto.name) {
      const existing = await this.prisma.topping.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Tên topping đã tồn tại!');
      }
    }

    const { categoryIds, ...data } = dto;

    return this.prisma.topping.update({
      where: { id },
      data: {
        ...data,
        categories: categoryIds !== undefined
            ? { set: categoryIds.map((cId: number) => ({ id: Number(cId) })) }
            : undefined,
      },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id, true);

    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: false },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: true },
    });
  }
}