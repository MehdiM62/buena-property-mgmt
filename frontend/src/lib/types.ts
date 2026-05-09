export type ManagementType = 'WEG' | 'MV';
export type PropertyStatus = 'draft' | 'active';
export type UnitType = 'apartment' | 'office' | 'garden' | 'parking';
export type ExtractionStatus = 'pending' | 'done' | 'failed' | 'none';

export interface Property {
  id: string;
  name: string;
  object_number: string;
  management_type: ManagementType;
  status: PropertyStatus;
  property_manager_name?: string;
  property_manager_company?: string;
  accountant_name?: string;
  accountant_company?: string;
  document_url?: string;
  created_at: string;
  buildings?: Building[];
  _count?: { buildings: number };
}

export interface Building {
  id: string;
  property_id: string;
  name: string;
  street: string;
  house_number: string;
  additional_info?: string;
  construction_year?: number;
  units?: Unit[];
}

export interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  type: UnitType;
  floor?: string;
  entrance?: string;
  size_sqm: number | string;
  co_ownership_share: string;
  construction_year?: number;
  rooms?: number;
}

export interface ExtractionResult {
  id?: string;
  status: ExtractionStatus;
  raw_result?: {
    property: {
      name: string;
      object_number: string;
      management_type: ManagementType;
      property_manager_name?: string;
      accountant_name?: string;
    };
    buildings: Array<{
      name: string;
      street: string;
      house_number: string;
      additional_info?: string;
    }>;
    units: Array<{
      unit_number: string;
      type: UnitType;
      building: string;
      floor?: string;
      entrance?: string;
      size_sqm: number;
      co_ownership_share: string;
      rooms?: number;
      construction_year?: number;
    }>;
  };
}
