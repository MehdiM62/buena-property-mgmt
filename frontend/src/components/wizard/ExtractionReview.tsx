'use client';

import { useState } from 'react';
import Portal from '@/components/Portal';
import type { ExtractionResult, ManagementType, UnitType } from '@/lib/types';

type RawResult = NonNullable<ExtractionResult['raw_result']>;

interface Props {
  extraction: ExtractionResult;
  onApply: (data: RawResult) => void;
  onClose: () => void;
}

const UNIT_TYPES: UnitType[] = ['apartment', 'office', 'garden', 'parking'];

export default function ExtractionReview({ extraction, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<RawResult>(() =>
    JSON.parse(JSON.stringify(extraction.raw_result!)),
  );

  const updateProperty = (key: string, value: string) =>
    setDraft((prev) => ({ ...prev, property: { ...prev.property, [key]: value } }));

  const updateBuilding = (index: number, key: string, value: string) =>
    setDraft((prev) => {
      const buildings = prev.buildings.map((b, i) => (i === index ? { ...b, [key]: value } : b));
      return { ...prev, buildings };
    });

  const updateUnit = (index: number, key: string, value: string | number | null) =>
    setDraft((prev) => {
      const units = prev.units.map((u, i) => (i === index ? { ...u, [key]: value } : u));
      return { ...prev, units };
    });

  const fieldInput = (
    value: string,
    onChange: (v: string) => void,
    className = '',
    placeholder = '',
  ) => (
    <input
      className={`bg-transparent border-0 border-b border-current/20 focus:border-current/60 outline-none w-full text-gray-800 placeholder-gray-400 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Extraction Review</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Edit any field before applying. Changes here are not saved until you click Apply.
              </p>
            </div>
            <button onClick={onClose} className="btn-ghost text-xl leading-none">×</button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Property fields */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                Property
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(draft.property) as [string, string][]).map(([k, v]) => (
                  <div key={k} className="bg-blue-50 rounded-lg px-4 py-3">
                    <label className="text-xs text-blue-500 font-medium block mb-1">
                      {k.replace(/_/g, ' ')}
                    </label>
                    {k === 'management_type' ? (
                      <select
                        className="bg-transparent border-0 border-b border-blue-200 focus:border-blue-500 outline-none text-sm font-medium text-gray-800 w-full"
                        value={v}
                        onChange={(e) => updateProperty(k, e.target.value)}
                      >
                        <option value="WEG">WEG</option>
                        <option value="MV">MV</option>
                      </select>
                    ) : (
                      fieldInput(v ?? '', (val) => updateProperty(k, val), 'text-sm font-medium')
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Buildings */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Buildings ({draft.buildings.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {draft.buildings.map((b, i) => (
                  <div key={i} className="bg-purple-50 rounded-lg px-4 py-3 space-y-2">
                    {fieldInput(
                      b.name,
                      (v) => updateBuilding(i, 'name', v),
                      'text-sm font-medium text-gray-900',
                      'Building name',
                    )}
                    <div className="flex gap-2">
                      {fieldInput(
                        b.street,
                        (v) => updateBuilding(i, 'street', v),
                        'text-xs text-gray-600 flex-1',
                        'Street',
                      )}
                      {fieldInput(
                        b.house_number,
                        (v) => updateBuilding(i, 'house_number', v),
                        'text-xs text-gray-600 w-14',
                        'No.',
                      )}
                    </div>
                    {fieldInput(
                      b.additional_info ?? '',
                      (v) => updateBuilding(i, 'additional_info', v),
                      'text-xs text-gray-400',
                      'Additional info',
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Units */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Units ({draft.units.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Unit', 'Type', 'Building', 'Floor', 'Entrance', 'Size (m²)', 'MEA Share', 'Rooms'].map(
                        (h) => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.units.map((u, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                        <td className="px-3 py-1.5">
                          <input
                            className="font-mono font-medium bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-12"
                            value={u.unit_number}
                            onChange={(e) => updateUnit(i, 'unit_number', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none capitalize"
                            value={u.type}
                            onChange={(e) => updateUnit(i, 'type', e.target.value as UnitType)}
                          >
                            {UNIT_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-20"
                            value={u.building}
                            onChange={(e) => updateUnit(i, 'building', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-14"
                            value={u.floor ?? ''}
                            onChange={(e) => updateUnit(i, 'floor', e.target.value || null)}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-10"
                            value={u.entrance ?? ''}
                            onChange={(e) => updateUnit(i, 'entrance', e.target.value || null)}
                            placeholder="-"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.1"
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-16"
                            value={u.size_sqm}
                            onChange={(e) => updateUnit(i, 'size_sqm', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="font-mono bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-24"
                            value={u.co_ownership_share}
                            onChange={(e) => updateUnit(i, 'co_ownership_share', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            className="bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none w-10"
                            value={u.rooms ?? ''}
                            onChange={(e) =>
                              updateUnit(i, 'rooms', e.target.value ? parseInt(e.target.value) : null)
                            }
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Applying this data will replace any existing buildings and units for this property.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => onApply(draft)} className="btn-primary">
                Apply extracted data →
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
