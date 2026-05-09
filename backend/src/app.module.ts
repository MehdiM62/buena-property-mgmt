import { Module } from '@nestjs/common';
import { PropertiesModule } from './properties/properties.module';
import { BuildingsModule } from './buildings/buildings.module';
import { UnitsModule } from './units/units.module';
import { ExtractionModule } from './extraction/extraction.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PropertiesModule,
    BuildingsModule,
    UnitsModule,
    ExtractionModule,
  ],
})
export class AppModule {}
