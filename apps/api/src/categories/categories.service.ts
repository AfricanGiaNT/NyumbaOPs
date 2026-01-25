import { Injectable } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll(type?: CategoryType) {
    return this.prisma.category.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto, userId: string) {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        isSystem: dto.isSystem ?? false,
        createdBy: userId,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Category',
      resourceId: category.id,
      userId,
      details: { name: category.name, type: category.type },
    });

    return category;
  }
}

