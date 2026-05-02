import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import type { ProposalBase } from '../../types';

interface Props {
  baseline: ProposalBase | null | undefined;
  fieldKey: keyof ProposalBase;
  currentValue: string;
  onRevert: () => void;
}

export default function BaselineBadge({ baseline, fieldKey, currentValue, onRevert }: Props) {
  if (!baseline) return null;
  const baselineValue = baseline[fieldKey];
  if (currentValue === baselineValue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
        AI推奨
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
      変更済
      <button
        type="button"
        onClick={onRevert}
        className="text-orange-700 hover:text-orange-900"
        aria-label="提案値に戻す"
        title={`提案値「${baselineValue || '(未指定)'}」に戻す`}
      >
        <ArrowUturnLeftIcon className="w-3 h-3" />
      </button>
    </span>
  );
}
