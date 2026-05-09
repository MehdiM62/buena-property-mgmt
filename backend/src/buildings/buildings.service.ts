import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async create(propertyId: string, dto: CreateBuildingDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

    return this.prisma.building.create({
      data: { ...dto, property_id: propertyId },
      include: { units: true },
    });
  }

  async findByProperty(propertyId: string) {
    return this.prisma.building.findMany({
      where: { property_id: propertyId },
      include: { units: true },
    });
  }

  async update(id: string, dto: UpdateBuildingDto) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException(`Building ${id} not found`);

    return this.prisma.building.update({
      where: { id },
      data: dto,
      include: { units: true },
    });
  }

  async remove(id: string) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException(`Building ${id} not found`);

    return this.prisma.building.delete({ where: { id } });
  }
}
