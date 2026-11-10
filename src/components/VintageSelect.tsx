/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { STANDARD_VINTAGES } from '../types/cellar';
import { Calendar, ChevronDown, Edit3 } from 'lucide-react';

interface VintageSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export const VintageSelect: React.FC<VintageSelectProps> = ({
  value,
  onChange,
  className = '',
  required = false,
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // If the incoming value is not in STANDARD_VINTAGES and not empty, check if it's a custom vintage
  const isStandardValue = STANDARD_VINTAGES.some(
    (v) => String(v).toLowerCase() === String(value).trim().toLowerCase()
  );

  useEffect(() => {
    if (!isStandardValue && value && value !== 'NV') {
      setCustomInput(value);
    }
  }, [value, isStandardValue]);

  if (isCustomMode) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              onChange(e.target.value.trim());
            }}
            placeholder="e.g. 1945 or Solera 1880"
            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono pr-20"
            required={required}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(false);
              onChange(value || '2021');
            }}
            className="absolute right-1.5 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            List
          </button>
        </div>
      </div>
    );
  }

  // If the current value is a rare custom vintage, include it dynamically in the dropdown
  const showCustomOption = !isStandardValue && Boolean(value && value !== 'NV');

  return (
    <div className={`relative ${className}`}>
      <select
        value={showCustomOption ? value : value || '2021'}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__custom__') {
            setIsCustomMode(true);
            setCustomInput(value || '');
          } else {
            onChange(val);
          }
        }}
        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono appearance-none pr-8 cursor-pointer text-slate-900 font-medium"
        required={required}
      >
        <optgroup label="Special / Multi-Vintage">
          <option value="NV">NV · Non-Vintage / Solera</option>
        </optgroup>

        {showCustomOption && (
          <optgroup label="Historical / Custom Vintage">
            <option value={value}>{value} (Custom)</option>
          </optgroup>
        )}

        <optgroup label="Harvest Vintages (2026 – 1950)">
          {STANDARD_VINTAGES.filter((v) => v !== 'NV').map((yr) => (
            <option key={yr} value={String(yr)}>
              {yr}
            </option>
          ))}
        </optgroup>

        <optgroup label="Other">
          <option value="__custom__">Custom / Pre-1950 Year...</option>
        </optgroup>
      </select>

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
