import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller()
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post('properties/:propertyId/buildings')
  create(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateBuildingDto,
  ) {
    return this.buildingsService.create(propertyId, dto);
  }

  @Get('properties/:propertyId/buildings')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.buildingsService.findByProperty(propertyId);
  }

  @Patch('buildings/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildingsService.update(id, dto);
  }

  @Delete('buildings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.buildingsService.remove(id);
  }
}
