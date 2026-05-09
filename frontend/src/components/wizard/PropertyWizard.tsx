'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Building, Property, Unit } from '@/lib/types';
import Step1BasicInfo from './Step1BasicInfo';
import Step2Buildings from './Step2Buildings';
import Step3Units from './Step3Units';

const STEPS = ['Basic Info & Document', 'Buildings', 'Units'];

export default function PropertyWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const existingId = params.get('id');

  const [step, setStep] = useState(0);
  const [property, setProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingId) {
      api.properties.get(existingId).then(setProperty).catch(() => {
        toast.error('Property not found');
        router.push('/');
      });
    }
  }, [existingId]);

  const handleStep1Save = async (data: Partial<Property>) => {
    setSaving(true);
    try {
      let saved: Property;
      if (property) {
        saved = await api.properties.update(property.id, data);
      } else {
        saved = await api.properties.create(data);
      }
      setProperty(saved);
      toast.success('Property info saved');
      setStep(1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStep1ExtractionApply = (updated: Property) => {
    setProperty(updated);
    toast.success('Extraction applied — buildings and units pre-filled');
    setStep(1);
  };

  const handlePublish = async () => {
    if (!property) return;
    setSaving(true);
    try {
      await api.properties.publish(property.id);
      toast.success('Property published successfully!');
      router.push('/');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/')}
          className="btn-ghost text-sm"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {property ? `Editing: ${property.name}` : 'New Property'}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => property && i < step + 1 && setStep(i)}
              disabled={!property || i > step}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-blue-600 text-white'
                  : i < step
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === step
                    ? 'bg-white text-blue-600'
                    : i < step
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${i < step ? 'bg-blue-400' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === 0 && (
        <Step1BasicInfo
          property={property}
          saving={saving}
          onSave={handleStep1Save}
          onExtractionApplied={handleStep1ExtractionApply}
        />
      )}
      {step === 1 && property && (
        <Step2Buildings
          property={property}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && property && (
        <Step3Units
          property={property}
          saving={saving}
          onBack={() => setStep(1)}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}
