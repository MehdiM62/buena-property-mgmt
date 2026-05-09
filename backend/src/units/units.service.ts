import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(buildingId: string, dto: CreateUnitDto) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException(`Building ${buildingId} not found`);

    return this.prisma.unit.create({
      data: { ...dto, building_id: buildingId },
    });
  }

  async bulkCreate(buildingId: string, units: CreateUnitDto[]) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException(`Building ${buildingId} not found`);

    return this.prisma.$transaction(
      units.map((unit) =>
        this.prisma.unit.create({
          data: { ...unit, building_id: buildingId },
        }),
      ),
    );
  }

  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);

    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);

    return this.prisma.unit.delete({ where: { id } });
  }
}
