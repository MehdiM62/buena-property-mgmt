'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Building, Property } from '@/lib/types';

interface Props {
  property: Property;
  onNext: () => void;
  onBack: () => void;
}

const emptyBuilding = (): Partial<Building> => ({
  name: '',
  street: '',
  house_number: '',
  additional_info: '',
  construction_year: undefined,
});

export default function Step2Buildings({ property, onNext, onBack }: Props) {
  const [buildings, setBuildings] = useState<Building[]>(property.buildings ?? []);
  const [draft, setDraft] = useState<Partial<Building> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.properties.get(property.id).then((p) => setBuildings(p.buildings ?? []));
  }, [property.id]);

  const handleAdd = async () => {
    if (!draft) { setDraft(emptyBuilding()); return; }
    if (!draft.name || !draft.street || !draft.house_number) {
      toast.error('Name, street and house number are required');
      return;
    }
    setSaving(true);
    try {
      const created = await api.buildings.create(property.id, draft);
      setBuildings((prev) => [...prev, created]);
      setDraft(null);
      toast.success('Building added');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await api.buildings.delete(id);
      setBuildings((prev) => prev.filter((b) => b.id !== id));
      toast.success('Building removed');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Buildings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Add the buildings that make up this property
          </p>
        </div>
        <button
          onClick={() => setDraft(emptyBuilding())}
          className="btn-secondary text-sm"
          disabled={draft !== null}
        >
          + Add building
        </button>
      </div>

      {/* Buildings list */}
      {buildings.length === 0 && !draft && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No buildings yet. Add a building or go back to upload a document.
        </div>
      )}

      <div className="space-y-3 mb-5">
        {buildings.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
          >
            <div>
              <p className="font-medium text-sm text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-500">
                {b.street} {b.house_number}
                {b.additional_info ? ` · ${b.additional_info}` : ''}
                {b.units?.length ? ` · ${b.units.length} units` : ''}
              </p>
            </div>
            <button
              onClick={() => handleDelete(b.id)}
              className="btn-danger text-xs py-1 px-2"
              disabled={saving}
            >
              Remove
            </button>
          </div>
        ))}

        {/* Inline add form */}
        {draft && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">New building</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="label">Building name *</label>
                <input
                  className="input"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
                  placeholder="e.g. Haus A – Parkside"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Street *</label>
                <input
                  className="input"
                  value={draft.street ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d!, street: e.target.value }))}
                  placeholder="e.g. Am Fiktivpark"
                />
              </div>
              <div>
                <label className="label">House number *</label>
                <input
                  className="input"
                  value={draft.house_number ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d!, house_number: e.target.value }))}
                  placeholder="e.g. 12"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Additional info</label>
                <input
                  className="input"
                  value={draft.additional_info ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d!, additional_info: e.target.value }))}
                  placeholder="e.g. 10557 Berlin, 5 floors, elevator"
                />
              </div>
              <div>
                <label className="label">Construction year</label>
                <input
                  className="input"
                  type="number"
                  value={draft.construction_year ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d!,
                      construction_year: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="e.g. 2023"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} className="btn-primary text-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save building'}
              </button>
              <button onClick={() => setDraft(null)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button
          onClick={onNext}
          className="btn-primary"
          disabled={buildings.length === 0}
        >
          Next: Units →
        </button>
      </div>
    </div>
  );
}
