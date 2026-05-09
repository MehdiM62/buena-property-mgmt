'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ExtractionResult, Property } from '@/lib/types';
import ExtractionReview from './ExtractionReview';

interface Props {
  property: Property | null;
  saving: boolean;
  onSave: (data: Partial<Property>) => void;
  onExtractionApplied: (updated: Property) => void;
}

export default function Step1BasicInfo({ property, saving, onSave, onExtractionApplied }: Props) {
  const [form, setForm] = useState({
    name: property?.name ?? '',
    object_number: property?.object_number ?? '',
    management_type: property?.management_type ?? 'WEG',
    property_manager_name: property?.property_manager_name ?? '',
    property_manager_company: property?.property_manager_company ?? '',
    accountant_name: property?.accountant_name ?? '',
    accountant_company: property?.accountant_company ?? '',
  });

  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name,
        object_number: property.object_number,
        management_type: property.management_type,
        property_manager_name: property.property_manager_name ?? '',
        property_manager_company: property.property_manager_company ?? '',
        accountant_name: property.accountant_name ?? '',
        accountant_company: property.accountant_company ?? '',
      });
    }
  }, [property]);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as any);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected later
    e.target.value = '';
    if (!file || !property) {
      if (!property) toast.error('Save basic info first before uploading');
      return;
    }
    setUploadState('uploading');
    try {
      await api.extraction.trigger(property.id, file);
      const result = await api.extraction.get(property.id);
      setExtraction(result);
      setUploadState('done');
      setShowReview(true);
    } catch {
      setUploadState('error');
      toast.error('Extraction failed');
    }
  };

  const handleApply = async () => {
    if (!property) return;
    try {
      const updated = await api.extraction.apply(property.id);
      onExtractionApplied(updated as Property);
      setShowReview(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Property details</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Management type */}
            <div>
              <label className="label">Management type *</label>
              <div className="flex gap-3">
                {(['WEG', 'MV'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('management_type', type)}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      form.management_type === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {type}
                    <span className="block text-xs font-normal mt-0.5">
                      {type === 'WEG'
                        ? 'Wohnungseigentumsgemeinschaft'
                        : 'Mietverwaltung'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Property name */}
            <div>
              <label className="label">Property name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Parkview Residences Berlin"
                required
              />
            </div>

            {/* Object number */}
            <div>
              <label className="label">Object number *</label>
              <input
                className="input font-mono"
                value={form.object_number}
                onChange={(e) => set('object_number', e.target.value)}
                placeholder="e.g. 10-557-PRB"
                pattern="\d{2}-\d{3}-[A-Z]{3}"
                title="Format: XX-XXX-XXX (e.g. 10-557-PRB)"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Format: XX-XXX-XXX (e.g. 10-557-PRB)</p>
            </div>

            {/* Contacts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Property manager name</label>
                <input
                  className="input"
                  value={form.property_manager_name}
                  onChange={(e) => set('property_manager_name', e.target.value)}
                  placeholder="e.g. ImmoGuard Berlin GmbH"
                />
              </div>
              <div>
                <label className="label">Property manager company</label>
                <input
                  className="input"
                  value={form.property_manager_company}
                  onChange={(e) => set('property_manager_company', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Accountant name</label>
                <input
                  className="input"
                  value={form.accountant_name}
                  onChange={(e) => set('accountant_name', e.target.value)}
                  placeholder="e.g. FinanzExpertise Müller & Co KG"
                />
              </div>
              <div>
                <label className="label">Accountant company</label>
                <input
                  className="input"
                  value={form.accountant_company}
                  onChange={(e) => set('accountant_company', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : property ? 'Save & continue →' : 'Create property →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PDF upload panel */}
      <div className="col-span-1">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Document extraction
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Upload a Teilungserklärung PDF to auto-fill buildings and units.
            You'll review the data before it's applied.
          </p>

          {!property && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 mb-3">
              Save basic info first to enable document upload.
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!property || uploadState === 'uploading'}
            className={`w-full border-2 border-dashed rounded-lg p-6 text-center text-sm transition-colors ${
              !property
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer'
            }`}
          >
            {uploadState === 'uploading' ? (
              <span>Extracting…</span>
            ) : uploadState === 'done' ? (
              <span className="text-green-600">✓ Extraction complete — review below</span>
            ) : (
              <>
                <div className="text-2xl mb-1">📄</div>
                Click to upload PDF
              </>
            )}
          </button>

          {extraction && uploadState === 'done' && (
            <button
              className="btn-primary w-full mt-3 text-xs"
              onClick={() => setShowReview(true)}
            >
              Review extracted data
            </button>
          )}
        </div>
      </div>

      {/* Extraction review modal */}
      {showReview && extraction?.raw_result && (
        <ExtractionReview
          extraction={extraction}
          onApply={handleApply}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
