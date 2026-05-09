'use client';

import { Suspense } from 'react';
import PropertyWizard from '@/components/wizard/PropertyWizard';

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 py-12">Loading…</div>}>
      <PropertyWizard />
    </Suspense>
  );
}
