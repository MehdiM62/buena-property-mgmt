import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MOCK_EXTRACTION_RESULT = {
  property: {
    name: 'Parkview Residences Berlin',
    object_number: '10-557-PRB',
    management_type: 'WEG',
    property_manager_name: 'ImmoGuard Berlin GmbH',
    accountant_name: 'FinanzExpertise Müller & Co KG',
  },
  buildings: [
    {
      name: 'Haus A – Parkside',
      street: 'Am Fiktivpark',
      house_number: '12',
      additional_info: '10557 Berlin, 5 floors, elevator',
    },
    {
      name: 'Haus B – Cityside',
      street: 'Urbanstraße',
      house_number: '88',
      additional_info: '10557 Berlin, 4 floors, elevator',
    },
  ],
  units: [
    { unit_number: '01', type: 'apartment', building: 'Haus A', floor: 'EG', entrance: 'A', size_sqm: 95.0, co_ownership_share: '110.0/1000', rooms: 3, construction_year: 2023 },
    { unit_number: '02', type: 'apartment', building: 'Haus A', floor: 'EG', entrance: 'A', size_sqm: 92.5, co_ownership_share: '108.0/1000', rooms: 3, construction_year: 2023 },
    { unit_number: '03', type: 'apartment', building: 'Haus A', floor: '1.OG', entrance: 'A', size_sqm: 105.0, co_ownership_share: '120.0/1000', rooms: 4, construction_year: 2023 },
    { unit_number: '04', type: 'apartment', building: 'Haus A', floor: '2.OG', entrance: 'A', size_sqm: 78.0, co_ownership_share: '90.0/1000', rooms: 2, construction_year: 2023 },
    { unit_number: '05', type: 'apartment', building: 'Haus A', floor: '4.OG', entrance: 'A', size_sqm: 145.0, co_ownership_share: '160.0/1000', rooms: 4, construction_year: 2023 },
    { unit_number: '06', type: 'office', building: 'Haus B', floor: 'EG', entrance: 'B', size_sqm: 110.0, co_ownership_share: '125.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '07', type: 'apartment', building: 'Haus B', floor: '1.OG', entrance: 'B', size_sqm: 65.0, co_ownership_share: '75.0/1000', rooms: 2, construction_year: 2023 },
    { unit_number: '08', type: 'apartment', building: 'Haus B', floor: '2.OG', entrance: 'B', size_sqm: 88.0, co_ownership_share: '102.0/1000', rooms: 3, construction_year: 2023 },
    { unit_number: '09', type: 'parking', building: 'Haus A', floor: 'UG', entrance: null, size_sqm: 12.5, co_ownership_share: '1.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '10', type: 'parking', building: 'Haus A', floor: 'UG', entrance: null, size_sqm: 12.5, co_ownership_share: '1.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '11', type: 'parking', building: 'Haus A', floor: 'UG', entrance: null, size_sqm: 12.5, co_ownership_share: '1.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '12', type: 'parking', building: 'Haus A', floor: 'UG', entrance: null, size_sqm: 12.5, co_ownership_share: '1.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '13', type: 'parking', building: 'Haus A', floor: 'UG', entrance: null, size_sqm: 12.5, co_ownership_share: '1.0/1000', rooms: null, construction_year: 2023 },
    { unit_number: '14', type: 'garden', building: 'Haus A', floor: 'EG', entrance: null, size_sqm: 40.0, co_ownership_share: '5.0/1000', rooms: null, construction_year: 2023 },
  ],
};

@Injectable()
export class ExtractionService {
  constructor(private prisma: PrismaService) {}

  async triggerExtraction(propertyId: string, documentUrl?: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

    // Delete any existing extraction for this property
    await this.prisma.extraction.deleteMany({ where: { property_id: propertyId } });

    // Store document URL on property if provided
    if (documentUrl) {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { document_url: documentUrl },
      });
    }

    // Simulate async extraction — returns "done" immediately with mock data
    const extraction = await this.prisma.extraction.create({
      data: {
        property_id: propertyId,
        status: 'done',
        raw_result: MOCK_EXTRACTION_RESULT as any,
      },
    });

    return { extraction_id: extraction.id, status: extraction.status };
  }

  async getExtraction(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

    const extraction = await this.prisma.extraction.findFirst({
      where: { property_id: propertyId },
      orderBy: { created_at: 'desc' },
    });

    if (!extraction) {
      return { status: 'none', raw_result: null };
    }

    return {
      id: extraction.id,
      status: extraction.status,
      raw_result: extraction.raw_result,
    };
  }

  async applyExtraction(propertyId: string, overrideData?: unknown) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

    let result: typeof MOCK_EXTRACTION_RESULT;

    if (overrideData) {
      result = overrideData as typeof MOCK_EXTRACTION_RESULT;
    } else {
      const extraction = await this.prisma.extraction.findFirst({
        where: { property_id: propertyId, status: 'done' },
        orderBy: { created_at: 'desc' },
      });
      if (!extraction) {
        throw new BadRequestException('No completed extraction found for this property');
      }
      result = extraction.raw_result as typeof MOCK_EXTRACTION_RESULT;
    }

    // Update property fields from extraction
    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        name: result.property.name,
        management_type: result.property.management_type as any,
        property_manager_name: result.property.property_manager_name,
        accountant_name: result.property.accountant_name,
      },
    });

    // Delete existing buildings and units (cascade), then recreate from extraction
    await this.prisma.building.deleteMany({ where: { property_id: propertyId } });

    const buildingMap: Record<string, string> = {};

    for (const b of result.buildings) {
      const building = await this.prisma.building.create({
        data: {
          property_id: propertyId,
          name: b.name,
          street: b.street,
          house_number: b.house_number,
          additional_info: b.additional_info,
        },
      });
      // Map short name (e.g. "Haus A") → building id
      const shortKey = b.name.split('–')[0].trim();
      buildingMap[shortKey] = building.id;
      buildingMap[b.name] = building.id;
    }

    // Bulk create units
    const unitInserts = result.units.map((u) => {
      const buildingId =
        buildingMap[u.building] ??
        buildingMap[Object.keys(buildingMap).find((k) => k.startsWith(u.building)) ?? ''];

      if (!buildingId) throw new BadRequestException(`Building "${u.building}" not found in extraction`);

      return this.prisma.unit.create({
        data: {
          building_id: buildingId,
          unit_number: u.unit_number,
          type: u.type as any,
          floor: u.floor,
          entrance: u.entrance,
          size_sqm: u.size_sqm,
          co_ownership_share: u.co_ownership_share,
          rooms: u.rooms,
          construction_year: u.construction_year,
        },
      });
    });

    await this.prisma.$transaction(unitInserts);

    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { buildings: { include: { units: true } } },
    });
  }
}
