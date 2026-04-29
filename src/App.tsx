import { useState } from 'react';
import Step1 from './components/Step1';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import Step4 from './components/Step4';
import SampleBook from './components/SampleBook/SampleBook';
import AuthGate from './components/SampleBook/AuthGate';
import { initialSpecData } from './types';
import type { SpecData } from './types';
import './index.css';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [specData, setSpecData] = useState<SpecData>(initialSpecData);

  const steps = [
    { id: 1, name: 'STEP1: 企画流し込み' },
    { id: 2, name: 'STEP2: 組み合わせ提案' },
    { id: 3, name: 'STEP3: デザイン化' },
    { id: 4, name: 'STEP4: 最終仕様書' },
    { id: 5, name: 'サンプル帳' },
  ];

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const resetData = () => {
    setSpecData(initialSpecData);
    setCurrentStep(1);
  };

  const updateData = (updates: Partial<SpecData>) => {
    setSpecData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthGate>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header / Tabs - Hidden when printing */}
      <div className="bg-white shadow print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex border-b border-gray-200" aria-label="進行ステップ">
            {steps.map((step) => {
              const isCurrent = currentStep === step.id;
              const isComplete = step.id < currentStep && step.id <= 4;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
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
          {currentStep === 1 && (
            <Step1 data={specData} updateData={updateData} onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <Step2
              data={specData}
              updateData={updateData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3
              data={specData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <Step4 data={specData} updateData={updateData} onReset={resetData} onBack={handleBack} />
          )}
          {currentStep === 5 && (
            <SampleBook />
          )}
        </div>
      </main>
    </div>
    </AuthGate>
  );
}

export default App;
