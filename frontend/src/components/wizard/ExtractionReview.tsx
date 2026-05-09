'use client';

import Portal from '@/components/Portal';
import type { ExtractionResult } from '@/lib/types';

interface Props {
  extraction: ExtractionResult;
  onApply: () => void;
  onClose: () => void;
}

export default function ExtractionReview({ extraction, onApply, onClose }: Props) {
  const result = extraction.raw_result!;

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Extraction Review</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review the extracted data. This is your chance to catch OCR errors before
              anything is saved.
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
              {Object.entries(result.property).map(([k, v]) => (
                <div key={k} className="bg-blue-50 rounded-lg px-4 py-3">
                  <span className="text-xs text-blue-500 font-medium block mb-0.5">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Buildings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              Buildings ({result.buildings.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {result.buildings.map((b, i) => (
                <div key={i} className="bg-purple-50 rounded-lg px-4 py-3">
                  <p className="font-medium text-sm text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.street} {b.house_number}
                    {b.additional_info ? ` · ${b.additional_info}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Units */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Units ({result.units.length})
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
                  {result.units.map((u, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 font-mono font-medium">{u.unit_number}</td>
                      <td className="px-3 py-2 capitalize">{u.type}</td>
                      <td className="px-3 py-2">{u.building}</td>
                      <td className="px-3 py-2">{u.floor ?? '-'}</td>
                      <td className="px-3 py-2">{u.entrance ?? '-'}</td>
                      <td className="px-3 py-2">{u.size_sqm}</td>
                      <td className="px-3 py-2 font-mono">{u.co_ownership_share}</td>
                      <td className="px-3 py-2">{u.rooms ?? '-'}</td>
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
            <button onClick={onApply} className="btn-primary">
              Apply extracted data →
            </button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
