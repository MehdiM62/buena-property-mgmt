'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Building, Property } from '@/lib/types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.properties
      .get(id)
      .then(setProperty)
      .catch(() => { toast.error('Property not found'); router.push('/'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!property) return;
    if (!confirm(`Delete draft property "${property.name}"?`)) return;
    try {
      await api.properties.delete(property.id);
      toast.success('Property deleted');
      router.push('/');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePublish = async () => {
    if (!property) return;
    try {
      await api.properties.publish(property.id);
      toast.success('Property published');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return <div className="card p-12 text-center text-gray-400">Loading…</div>;
  }

  if (!property) return null;

  const totalUnits = (property.buildings ?? []).reduce(
    (sum, b) => sum + (b.units?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="btn-ghost text-sm">
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
              <span className={property.status === 'active' ? 'badge-active' : 'badge-draft'}>
                {property.status}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                {property.management_type}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{property.object_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/properties/new?id=${property.id}`} className="btn-secondary text-sm">
            Edit in wizard
          </Link>
          {property.status === 'draft' && (
            <button onClick={handlePublish} className="btn-primary text-sm">
              Publish
            </button>
          )}
          {property.status === 'draft' && (
            <button onClick={handleDelete} className="btn-danger text-sm">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        <InfoCard label="Property manager" value={property.property_manager_name} sub={property.property_manager_company} />
        <InfoCard label="Accountant" value={property.accountant_name} sub={property.accountant_company} />
        <InfoCard
          label="Portfolio"
          value={`${property.buildings?.length ?? 0} buildings`}
          sub={`${totalUnits} units`}
        />
      </div>

      {/* Buildings & units */}
      {(property.buildings ?? []).length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No buildings yet.{' '}
          <Link href={`/properties/new?id=${property.id}`} className="text-blue-600 underline">
            Open wizard to add buildings and units.
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(property.buildings ?? []).map((building) => (
            <BuildingCard key={building.id} building={building} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value?: string | null;
  sub?: string | null;
}) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BuildingCard({ building }: { building: Building }) {
  const units = building.units ?? [];

  const unitTypeColors: Record<string, string> = {
    apartment: 'bg-blue-50 text-blue-700',
    office: 'bg-purple-50 text-purple-700',
    parking: 'bg-gray-100 text-gray-600',
    garden: 'bg-green-50 text-green-700',
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900">{building.name}</p>
          <p className="text-xs text-gray-500">
            {building.street} {building.house_number}
            {building.additional_info ? ` · ${building.additional_info}` : ''}
          </p>
        </div>
        <span className="text-xs text-gray-400">{units.length} units</span>
      </div>

      {units.length === 0 ? (
        <p className="px-5 py-4 text-xs text-gray-400">No units in this building.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                {['Unit', 'Type', 'Floor', 'Entrance', 'Size m²', 'MEA Share', 'Rooms'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold">{unit.unit_number}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${unitTypeColors[unit.type] ?? 'bg-gray-100'}`}>
                      {unit.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{unit.floor ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{unit.entrance ?? '—'}</td>
                  <td className="px-4 py-2">{Number(unit.size_sqm).toFixed(1)}</td>
                  <td className="px-4 py-2 font-mono text-gray-600">{unit.co_ownership_share}</td>
                  <td className="px-4 py-2 text-gray-600">{unit.rooms ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
