import { useCallback, useEffect, useRef, useState } from 'react';
import Step1 from './components/Step1';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import Step4 from './components/Step4';
import SampleBook from './components/SampleBook/SampleBook';
import type { PutterSample } from './components/SampleBook/types';
import AuthGate from './components/SampleBook/AuthGate';
import Home from './components/Home/Home';
import { initialSpecData } from './types';
import type { SpecData } from './types';
import { useSpecDrafts, type WizardStep, type DraftEnvelope } from './hooks/useSpecDrafts';
import { getShapeByAlias } from './utils/specHelpers';
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import './index.css';

type View =
  | { kind: 'home' }
  | { kind: 'wizard'; draftId: string; step: WizardStep }
  | { kind: 'samples'; mode?: 'browse' | 'pick' };

function App() {
  const { drafts, createDraft, loadDraft, saveDraft, duplicateDraft, deleteDraft } = useSpecDrafts();
  const [view, setView] = useState<View>({ kind: 'home' });
  const [specData, setSpecData] = useState<SpecData>(initialSpecData);
  const saveTimer = useRef<number | null>(null);

  const goHome = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setView({ kind: 'home' });
  }, []);

  const openDraft = useCallback(
    (id: string) => {
      const env = loadDraft(id);
      if (!env) return;
      setSpecData(env.data);
      setView({ kind: 'wizard', draftId: id, step: env.lastStep });
    },
    [loadDraft],
  );

  const startWizardFromSeed = useCallback(
    (route: 'A' | 'B' | 'C', seed?: Partial<SpecData>) => {
      const id = createDraft(route, seed);
      setSpecData({ ...initialSpecData, ...(seed ?? {}), originRoute: route });
      setView({ kind: 'wizard', draftId: id, step: 1 });
    },
    [createDraft],
  );

  // Route C: blank
  const handleCreateConcept = useCallback(() => {
    startWizardFromSeed('C');
  }, [startWizardFromSeed]);

  // Route A: came from SampleBook → seed via getShapeByAlias
  const handleCreateFromSample = useCallback(
    (sample: PutterSample) => {
      const headShape = getShapeByAlias(sample.shape.head_type) ?? '';
      const seed: Partial<SpecData> = {
        originSampleId: sample.sample_number,
        headShape,
        brandName: sample.client ?? '',
      };
      startWizardFromSeed('A', seed);
    },
    [startWizardFromSeed],
  );

  // Route B: copy an existing draft, but reset productCode / issueDate / revisionHistory
  const handleCreateFromDraft = useCallback(
    (sourceDraft: DraftEnvelope) => {
      const today = new Date().toISOString().slice(0, 10);
      const seed: Partial<SpecData> = {
        ...sourceDraft.data,
        productCode: '',
        issueDate: today,
        revisionHistory: [{ date: today, content: '' }],
        originSampleId: undefined,
        originDraftId: sourceDraft.id,
      };
      startWizardFromSeed('B', seed);
    },
    [startWizardFromSeed],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm('この仕様書を削除します。よろしいですか？')) {
        deleteDraft(id);
      }
    },
    [deleteDraft],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateDraft(id);
    },
    [duplicateDraft],
  );

  const goStep = useCallback((step: WizardStep) => {
    setView((v) => (v.kind === 'wizard' ? { ...v, step } : v));
  }, []);

  const handleNext = useCallback(() => {
    setView((v) => {
      if (v.kind !== 'wizard') return v;
      const next = Math.min(4, v.step + 1) as WizardStep;
      return { ...v, step: next };
    });
  }, []);

  const handleBack = useCallback(() => {
    setView((v) => {
      if (v.kind !== 'wizard') return v;
      const next = Math.max(1, v.step - 1) as WizardStep;
      return { ...v, step: next };
    });
  }, []);

  const updateData = useCallback((updates: Partial<SpecData>) => {
    setSpecData((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (view.kind !== 'wizard') return;
    const id = view.draftId;
    const step = view.step;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveDraft(id, specData, step);
    }, 300);
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [view, specData, saveDraft]);

  if (view.kind === 'samples') {
    const mode = view.mode ?? 'browse';
    return (
      <AuthGate>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="bg-white shadow print:hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3 py-3">
              <button
                onClick={goHome}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4" /> ドラフト一覧へ
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-bold text-gray-800">
                サンプル帳{mode === 'pick' ? ' (起点を選択)' : ''}
              </span>
            </div>
          </div>
          <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <SampleBook mode={mode} onPickSample={handleCreateFromSample} />
          </main>
        </div>
      </AuthGate>
    );
  }

  if (view.kind === 'home') {
    return (
      <AuthGate>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <Home
              drafts={drafts}
              onCreateConcept={handleCreateConcept}
              onOpenSampleBookForRouteA={() => setView({ kind: 'samples', mode: 'pick' })}
              onCreateFromDraft={handleCreateFromDraft}
              onOpen={openDraft}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onOpenSamples={() => setView({ kind: 'samples', mode: 'browse' })}
            />
          </main>
        </div>
      </AuthGate>
    );
  }

  const wizardSteps: { id: WizardStep; name: string }[] = [
    { id: 1, name: 'STEP1: 企画流し込み' },
    { id: 2, name: 'STEP2: 組み合わせ提案' },
    { id: 3, name: 'STEP3: デザイン化' },
    { id: 4, name: 'STEP4: 最終仕様書' },
  ];

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white shadow print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <button
                onClick={goHome}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4" /> ドラフト一覧へ
              </button>
              <button
                onClick={() => setView({ kind: 'samples', mode: 'browse' })}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <BookOpenIcon className="w-4 h-4" /> サンプル帳
              </button>
            </div>
            <nav className="flex border-b border-gray-200" aria-label="進行ステップ">
              {wizardSteps.map((step) => {
                const isCurrent = view.step === step.id;
                const isComplete = step.id < view.step;
                return (
                  <button
                    key={step.id}
                    onClick={() => goStep(step.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                      isCurrent
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {isComplete && <span className="text-green-600 mr-1" aria-label="完了">✓</span>}
                    {step.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            {view.step === 1 && (
              <Step1
                data={specData}
                updateData={updateData}
                onNext={handleNext}
                draftLookup={loadDraft}
              />
            )}
            {view.step === 2 && (
              <Step2
                data={specData}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {view.step === 3 && (
              <Step3
                data={specData}
                updateData={updateData}
                draftId={view.draftId}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {view.step === 4 && (
              <Step4
                data={specData}
                updateData={updateData}
                draftId={view.draftId}
                onReset={goHome}
                onBack={handleBack}
              />
            )}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default App;
