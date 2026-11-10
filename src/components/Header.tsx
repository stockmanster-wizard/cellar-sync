/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Plus, Wine, Download, Upload, Sparkles, Trash2, CheckCircle2, SlidersHorizontal, Layers, LogOut, User as UserIcon, Copy, Check } from 'lucide-react';
import { AuthUser } from '../types/auth';

interface HeaderProps {
  currentTab: 'map' | 'inventory' | 'history' | 'audit';
  onSelectTab: (tab: 'map' | 'inventory' | 'history' | 'audit') => void;
  onOpenAddBottle: () => void;
  onLoadSeedData: () => void;
  onClearCellar: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onOpenStorageManager?: () => void;
  currentUser?: AuthUser | null;
  onLogOut?: () => void;
  activeCount: number;
  consumedCount: number;
  stagingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddBottle,
  onLoadSeedData,
  onClearCellar,
  onExportBackup,
  onImportBackup,
  onOpenStorageManager,
  currentUser,
  onLogOut,
  activeCount,
  consumedCount,
  stagingCount,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackup(content);
        setMenuOpen(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyUid = () => {
    if (!currentUser?.uid) return;
    navigator.clipboard?.writeText(currentUser.uid).catch(() => {});
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 1800);
  };

  const showValidPhoto = Boolean(currentUser?.photoURL && !avatarFailed);
  const providerLabel = currentUser?.provider === 'password' ? 'Account User ID' : 'Google User ID';

  const getMonogramInitials = (name?: string, email?: string): string => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      if (parts.length === 1) {
        return parts[0][0].toUpperCase();
      }
    }
    if (email && email.trim()) {
      const local = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
      if (local.length >= 2) return local.slice(0, 2).toUpperCase();
      if (local.length === 1) return local.toUpperCase();
    }
    return 'CS';
  };

  const monogram = getMonogramInitials(currentUser?.displayName, currentUser?.email);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
        
        {/* Zone 1: Brand Wordmark & Cellar Indicator */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
            <Wine className="w-4 h-4 text-rose-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-sans truncate">
                CellarSync
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap leading-none">
              <span className="tabular-nums font-medium text-slate-700">{activeCount}</span> in racks
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-slate-700">{stagingCount}</span> staging
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-slate-700">{consumedCount}</span> drunk
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop >= 1280px only; Mobile & Tablet use bottom tab bar) */}
        <nav className="hidden xl:flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            onClick={() => onSelectTab('map')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cellar Map
          </button>
          <button
            onClick={() => onSelectTab('inventory')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventory (<span className="tabular-nums">{activeCount + stagingCount}</span>)
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Consumed Log (<span className="tabular-nums">{consumedCount}</span>)
          </button>
          <button
            onClick={() => onSelectTab('audit')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'audit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reconcile Audit
          </button>
        </nav>

        {/* Zone 3: Primary Action, Cellar Tools & Compact Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenAddBottle}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg sm:rounded-xl transition-all shadow-xs active:scale-95 whitespace-nowrap shrink-0 min-h-[34px] sm:min-h-[38px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300 shrink-0" />
            <span>Add Bottle</span>
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setProfileOpen(false);
              }}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center border border-slate-200 cursor-pointer"
              title="Cellar Tools & Settings"
              aria-label="Cellar Tools"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 tracking-wider uppercase border-b border-slate-100">
                    Cellar Operations
                  </div>
                  
                  <button
                    onClick={() => {
                      onLoadSeedData();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-medium">Load Curated Sample Cellar</div>
                      <div className="text-[10px] text-slate-400">Seed realistic bottles & notes</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('audit');
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-medium">Reconcile Drift Audit</div>
                      <div className="text-[10px] text-slate-400">Match physical rack to app</div>
                    </div>
                  </button>

                  {onOpenStorageManager && (
                    <button
                      onClick={() => {
                        onOpenStorageManager();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-slate-600 shrink-0" />
                      <div>
                        <div className="font-medium">Manage Storage Units</div>
                        <div className="text-[10px] text-slate-400">Add, resize, or organize racks</div>
                      </div>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      onExportBackup();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Export JSON Backup</span>
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Import JSON Backup</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setShowClearConfirmModal(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Clear Cellar to Empty</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setMenuOpen(false);
              }}
              className="p-0.5 text-slate-700 hover:text-slate-900 rounded-lg sm:rounded-xl transition-colors cursor-pointer border border-slate-200 hover:border-slate-300 bg-slate-50 flex items-center justify-center min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px]"
              title={currentUser ? `${currentUser.displayName} (${currentUser.email})` : 'User Profile'}
              aria-label="User Profile"
            >
              {showValidPhoto ? (
                <img
                  src={currentUser!.photoURL}
                  alt={currentUser!.displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-stone-900 border border-stone-700/80 text-rose-300 font-serif font-bold text-[11px] flex items-center justify-center tracking-tight shadow-xs select-none">
                  {monogram}
                </div>
              )}
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
                  {/* Name & Email Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    {showValidPhoto ? (
                      <img
                        src={currentUser!.photoURL}
                        alt={currentUser!.displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-700/80 text-rose-300 font-serif font-bold text-sm flex items-center justify-center shrink-0 tracking-tight shadow-xs select-none">
                        {monogram}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {currentUser?.displayName || 'Cellar Sommelier'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {currentUser?.email || 'authenticated'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentUser?.provider === 'password' ? 'Signed in with Email' : 'Signed in with Google'}
                      </div>
                    </div>
                  </div>

                  {/* User ID Section */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {providerLabel}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUid}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Copy User ID"
                      >
                        {copiedUid ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-800 break-all select-all leading-snug">
                      {currentUser?.uid || '—'}
                    </div>
                  </div>

                  {/* Cellar Summary */}
                  <div className="text-xs text-slate-500 px-1 space-y-1">
                    <div className="flex justify-between">
                      <span>Account Name:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                        {currentUser?.displayName || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total In Cellar:</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">
                        {activeCount + stagingCount} bottles
                      </span>
                    </div>
                  </div>

                  {onLogOut && (
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onLogOut();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Clear Cellar Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Clear Entire Cellar?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                This will permanently delete all bottles from your cellar inventory. Your racks will be completely empty.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearCellar();
                  setShowClearConfirmModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[40px]"
              >
                Yes, Clear Cellar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
