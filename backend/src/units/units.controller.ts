import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('buildings/:buildingId/units')
  create(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.unitsService.create(buildingId, dto);
  }

  @Post('buildings/:buildingId/units/bulk')
  bulkCreate(
    @Param('buildingId') buildingId: string,
    @Body() body: { units: CreateUnitDto[] },
  ) {
    return this.unitsService.bulkCreate(buildingId, body.units);
  }

  @Patch('units/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete('units/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
