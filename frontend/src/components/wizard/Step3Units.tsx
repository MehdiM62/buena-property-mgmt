'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Building, Property, Unit, UnitType } from '@/lib/types';

interface Props {
  property: Property;
  saving: boolean;
  onBack: () => void;
  onPublish: () => void;
}

type UnitRow = Partial<Unit> & { _tempId: string; _dirty?: boolean; _new?: boolean };

const UNIT_TYPES: UnitType[] = ['apartment', 'office', 'garden', 'parking'];

const newRow = (buildingId: string): UnitRow => ({
  _tempId: Math.random().toString(36).slice(2),
  _new: true,
  building_id: buildingId,
  unit_number: '',
  type: 'apartment',
  floor: '',
  entrance: '',
  size_sqm: '',
  co_ownership_share: '',
  rooms: undefined,
  construction_year: undefined,
});

export default function Step3Units({ property, saving, onBack, onPublish }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [totalMEA, setTotalMEA] = useState(0);

  useEffect(() => {
    api.properties.get(property.id).then((p) => {
      const blds = p.buildings ?? [];
      setBuildings(blds);
      if (blds.length > 0) setSelectedBuilding(blds[0].id);
      const allRows: UnitRow[] = blds.flatMap((b) =>
        (b.units ?? []).map((u) => ({ ...u, _tempId: u.id!, building_id: b.id })),
      );
      setRows(allRows);
    });
  }, [property.id]);

  useEffect(() => {
    const total = rows
      .filter((r) => r.building_id === selectedBuilding)
      .reduce((sum, r) => {
        const share = String(r.co_ownership_share ?? '');
        const num = parseFloat(share.split('/')[0] ?? '0');
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    setTotalMEA(total);
  }, [rows, selectedBuilding]);

  const buildingRows = rows.filter((r) => r.building_id === selectedBuilding);

  const setCell = (tempId: string, key: keyof UnitRow, value: unknown) => {
    setRows((prev) =>
      prev.map((r) =>
        r._tempId === tempId ? { ...r, [key]: value, _dirty: true } : r,
      ),
    );
  };

  const addRow = () => {
    if (!selectedBuilding) return;
    setRows((prev) => [...prev, newRow(selectedBuilding)]);
  };

  const deleteRow = async (row: UnitRow) => {
    if (row._new || !row.id) {
      setRows((prev) => prev.filter((r) => r._tempId !== row._tempId));
      return;
    }
    try {
      await api.units.delete(row.id!);
      setRows((prev) => prev.filter((r) => r._tempId !== row._tempId));
      toast.success('Unit deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      const newUnits = rows.filter((r) => r._new && r.building_id === selectedBuilding);
      const dirtyUnits = rows.filter((r) => !r._new && r._dirty && r.id);

      // Bulk create new units
      if (newUnits.length > 0) {
        const created = await api.units.bulkCreate(
          selectedBuilding,
          newUnits.map(({ _tempId, _dirty, _new, ...u }) => u as any),
        );
        // Replace temp rows with saved rows
        setRows((prev) => {
          const withoutNew = prev.filter(
            (r) => !(r._new && r.building_id === selectedBuilding),
          );
          return [
            ...withoutNew,
            ...created.map((u: Unit) => ({ ...u, _tempId: u.id!, building_id: selectedBuilding })),
          ];
        });
      }

      // Patch dirty existing units
      await Promise.all(
        dirtyUnits.map(({ _tempId, _dirty, _new, ...u }) =>
          api.units.update(u.id!, u as any),
        ),
      );

      setRows((prev) => prev.map((r) => ({ ...r, _dirty: false, _new: false })));
      toast.success('Units saved');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const meaWarning = totalMEA > 0 && Math.abs(totalMEA - 1000) > 0.1;

  return (
    <div className="space-y-4">
      {/* Building tabs */}
      {buildings.length > 1 && (
        <div className="flex gap-2">
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBuilding(b.id)}
              className={`btn text-sm ${selectedBuilding === b.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Units
              {buildings.find((b) => b.id === selectedBuilding)
                ? ` — ${buildings.find((b) => b.id === selectedBuilding)!.name}`
                : ''}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {buildingRows.length} units
              {totalMEA > 0 && (
                <span className={meaWarning ? 'text-red-500 ml-2' : 'text-green-600 ml-2'}>
                  · MEA total: {totalMEA.toFixed(1)}/1000
                  {meaWarning ? ' ⚠ expected 1000' : ' ✓'}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={addRow} className="btn-secondary text-sm">
              + Add unit
            </button>
            <button onClick={saveAll} className="btn-primary text-sm" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save units'}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Unit #', 'Type', 'Floor', 'Entrance', 'Size m²', 'MEA Share', 'Rooms', 'Year', ''].map(
                  (h) => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {buildingRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-400">
                    No units yet. Click &ldquo;+ Add unit&rdquo; to start, or go back and upload a document.
                  </td>
                </tr>
              )}
              {buildingRows.map((row) => (
                <tr
                  key={row._tempId}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    row._new ? 'bg-blue-50' : row._dirty ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-16 py-1 font-mono"
                      value={row.unit_number ?? ''}
                      onChange={(e) => setCell(row._tempId, 'unit_number', e.target.value)}
                      placeholder="01"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      className="input text-xs py-1 w-24"
                      value={row.type ?? 'apartment'}
                      onChange={(e) => setCell(row._tempId, 'type', e.target.value)}
                    >
                      {UNIT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-16 py-1"
                      value={row.floor ?? ''}
                      onChange={(e) => setCell(row._tempId, 'floor', e.target.value)}
                      placeholder="EG"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-14 py-1"
                      value={row.entrance ?? ''}
                      onChange={(e) => setCell(row._tempId, 'entrance', e.target.value)}
                      placeholder="A"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-20 py-1"
                      type="number"
                      step="0.5"
                      value={row.size_sqm ?? ''}
                      onChange={(e) => setCell(row._tempId, 'size_sqm', e.target.value)}
                      placeholder="95.0"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-24 py-1 font-mono"
                      value={row.co_ownership_share ?? ''}
                      onChange={(e) => setCell(row._tempId, 'co_ownership_share', e.target.value)}
                      placeholder="110.0/1000"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-14 py-1"
                      type="number"
                      value={row.rooms ?? ''}
                      onChange={(e) =>
                        setCell(row._tempId, 'rooms', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="3"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input text-xs w-18 py-1"
                      type="number"
                      value={row.construction_year ?? ''}
                      onChange={(e) =>
                        setCell(
                          row._tempId,
                          'construction_year',
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="2023"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => deleteRow(row)}
                      className="text-red-400 hover:text-red-600 text-sm leading-none px-1"
                      title="Delete"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onPublish} className="btn-primary" disabled={saving || isSaving}>
          {saving ? 'Publishing…' : 'Publish property'}
        </button>
      </div>
    </div>
  );
}
