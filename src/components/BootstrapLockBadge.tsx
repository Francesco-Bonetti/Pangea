'use client';

import React from 'react';
import { Lock, Unlock, Shield } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

interface BootstrapLockBadgeProps {
  lockThreshold: number | null;
  lockCategory: string | null;
  verifiedCitizens: number;
  compact?: boolean;
}

export function BootstrapLockBadge({
  lockThreshold,
  lockCategory,
  verifiedCitizens,
  compact = false,
}: BootstrapLockBadgeProps) {
  const { t } = useLanguage();

  // If no threshold, don't render
  if (lockThreshold === null) {
    return null;
  }

  const isLocked = verifiedCitizens < lockThreshold;
  const remainingNeeded = lockThreshold - verifiedCitizens;
  const progressPercent = Math.min(100, (verifiedCitizens / lockThreshold) * 100);

  // Determine colors based on category
  const getCategoryColors = (category: string | null) => {
    switch (category) {
      case 'reinforced':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          icon: 'text-amber-600 dark:text-amber-400',
          bar: 'bg-amber-500 dark:bg-amber-600',
          badge: 'bg-amber-100 dark:bg-amber-900',
        };
      case 'structural':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-600 dark:text-blue-400',
          bar: 'bg-blue-500 dark:bg-blue-600',
          badge: 'bg-blue-100 dark:bg-blue-900',
        };
      case 'ordinary':
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-900',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          icon: 'text-slate-600 dark:text-slate-400',
          bar: 'bg-slate-400 dark:bg-slate-600',
          badge: 'bg-slate-100 dark:bg-slate-800',
        };
    }
  };

  const colors = getCategoryColors(lockCategory);

  // Category label
  const categoryLabel = lockCategory
    ? (t(`guardian.category.${lockCategory}`) || lockCategory)
    : '';

  if (compact) {
    // Compact inline badge
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${colors.badge} ${colors.text} border border-transparent`}
        title={
          isLocked
            ? t('guardian.bootstrapLocked')
            : t('guardian.bootstrapUnlocked')
        }
      >
        {isLocked ? (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>
              {`${t('guardian.lockedUntilN')} ${remainingNeeded}`}
            </span>
          </>
        ) : (
          <>
            <Unlock className="w-3.5 h-3.5" />
            <span>{t('guardian.bootstrapUnlocked')}</span>
          </>
        )}
      </div>
    );
  }

  // Full card mode
  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${colors.bg} ${colors.border}`}
    >
      {/* Header with icon and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.badge}`}>
            {isLocked ? (
              <Lock className={`w-4 h-4 ${colors.icon}`} />
            ) : (
              <Unlock className={`w-4 h-4 ${colors.icon}`} />
            )}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${colors.text}`}>
              {isLocked
                ? t('guardian.bootstrapLocked')
                : t('guardian.bootstrapUnlocked')}
            </h3>
            {categoryLabel && (
              <p className={`text-xs text-fg-muted mt-0.5`}>
                {categoryLabel}
              </p>
            )}
          </div>
        </div>
        {lockCategory && (
          <Shield className={`w-5 h-5 ${colors.icon} flex-shrink-0`} />
        )}
      </div>

      {/* Progress section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted">
            {t('guardian.verifiedCitizens')}
          </span>
          <span className={`font-medium ${colors.text}`}>
            {verifiedCitizens} / {lockThreshold}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-fg-muted/20 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      <div className={`text-sm ${colors.text}`}>
        {isLocked ? (
          <p>
            {`${t('guardian.neededForUnlock')} ${remainingNeeded}`}
          </p>
        ) : (
          <p className="text-fg-muted">
            {t('guardian.bootstrapPhaseComplete')}
          </p>
        )}
      </div>

      {/* Additional info row */}
      {isLocked && (
        <div className="pt-2 border-t border-fg-muted/20">
          <p className="text-xs text-fg-muted">
            {t('guardian.lockDescription')}
          </p>
        </div>
      )}
    </div>
  );
}

export default BootstrapLockBadge;
