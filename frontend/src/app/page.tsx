'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Property } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.properties
      .list()
      .then(setProperties)
      .catch(() => toast.error('Failed to load properties'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete draft property "${name}"?`)) return;
    try {
      await api.properties.delete(id);
      toast.success('Property deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePublish = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.properties.publish(id);
      toast.success('Property published');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your WEG and MV property portfolio
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary">
          <span className="text-lg leading-none">+</span>
          Add property
        </Link>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading properties…</div>
      ) : properties.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">No properties yet</p>
          <Link href="/properties/new" className="btn-primary">
            Add your first property
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Object No.</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Buildings</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/properties/${p.id}`)}
                  className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-blue-700 hover:underline">
                    {p.name}
                  </td>
                  <td className="px-5 py-4 font-mono text-gray-500">{p.object_number}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                      {p.management_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {p._count?.buildings ?? 0}
                  </td>
                  <td className="px-5 py-4">
                    <span className={p.status === 'active' ? 'badge-active' : 'badge-draft'}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div
                      className="flex items-center gap-2 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/properties/new?id=${p.id}`}
                        className="btn-ghost text-xs"
                      >
                        Edit
                      </Link>
                      {p.status === 'draft' && (
                        <button
                          onClick={(e) => handlePublish(e, p.id)}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Publish
                        </button>
                      )}
                      {p.status === 'draft' && (
                        <button
                          onClick={(e) => handleDelete(e, p.id, p.name)}
                          className="btn-danger text-xs py-1 px-3"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
