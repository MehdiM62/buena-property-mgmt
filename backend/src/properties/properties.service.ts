import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.property.findMany({
      select: {
        id: true,
        name: true,
        object_number: true,
        management_type: true,
        status: true,
        created_at: true,
        _count: { select: { buildings: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        buildings: {
          include: { units: true },
        },
      },
    });
    if (!property) throw new NotFoundException(`Property ${id} not found`);
    return property;
  }

  async create(dto: CreatePropertyDto) {
    const existing = await this.prisma.property.findUnique({
      where: { object_number: dto.object_number },
    });
    if (existing) {
      throw new ConflictException(
        `A property with object_number "${dto.object_number}" already exists`,
      );
    }

    return this.prisma.property.create({ data: dto });
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.findOne(id);

    if (dto.object_number) {
      const existing = await this.prisma.property.findFirst({
        where: { object_number: dto.object_number, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `object_number "${dto.object_number}" is already taken`,
        );
      }
    }

    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const property = await this.findOne(id);
    if (property.status === 'active') {
      throw new BadRequestException('Cannot delete an active property');
    }
    return this.prisma.property.delete({ where: { id } });
  }

  async publish(id: string) {
    const property = await this.findOne(id);
    if (property.status === 'active') {
      throw new BadRequestException('Property is already active');
    }
    return this.prisma.property.update({
      where: { id },
      data: { status: 'active' },
    });
  }
}
