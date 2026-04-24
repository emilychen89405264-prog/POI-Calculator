/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { format, addYears, addDays, isValid, parseISO, isAfter } from 'date-fns';
import { Calendar, Info, ChevronRight, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

enum Rank {
  SUPERVISOR = 'supervisor', // 督導及以下
  WORLD_TEAM = 'world_team', // 世界組及以上
  PREFERRED_CUSTOMER = 'preferred_customer', // 優惠顧客
}

export default function App() {
  const [lastActivityDate, setLastActivityDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [conversionDate, setConversionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isConversionMode, setIsConversionMode] = useState<boolean>(true);
  const [originalRank, setOriginalRank] = useState<Rank>(Rank.SUPERVISOR);
  const [targetRank, setTargetRank] = useState<Rank>(Rank.PREFERRED_CUSTOMER);

  const getWaitConfig = (rank: Rank) => {
    switch (rank) {
      case Rank.PREFERRED_CUSTOMER:
        return { days: 180, label: '180 天' };
      case Rank.SUPERVISOR:
        return { years: 1, label: '1 年' };
      case Rank.WORLD_TEAM:
        return { years: 2, label: '2 年' };
      default:
        return { days: 0, label: '0' };
    }
  };

  const calculationResult = useMemo(() => {
    const activityDate = parseISO(lastActivityDate);
    const convDate = parseISO(conversionDate);
    
    if (!isValid(activityDate)) return null;

    // Timeline 1: Based on Activity and Target Rank
    const targetWait = getWaitConfig(targetRank);
    const activityReEntry = targetWait.years 
      ? addYears(activityDate, targetWait.years)
      : addDays(activityDate, targetWait.days);

    let finalReEntryDate = activityReEntry;
    let conversionReEntry: Date | null = null;
    let sourceTimeline: 'activity' | 'conversion' = 'activity';

    // Timeline 2: Based on Conversion and Original Rank
    if (isConversionMode && isValid(convDate)) {
      const originalWait = getWaitConfig(originalRank);
      conversionReEntry = originalWait.years
        ? addYears(convDate, originalWait.years)
        : addDays(convDate, originalWait.days);

      if (isAfter(conversionReEntry, activityReEntry)) {
        finalReEntryDate = conversionReEntry;
        sourceTimeline = 'conversion';
      }
    }

    const waitEndDay = addDays(finalReEntryDate, -1);

    return {
      reEntryDate: format(finalReEntryDate, 'yyyy-MM-dd'),
      waitEndDay: format(waitEndDay, 'yyyy-MM-dd'),
      activityReEntry: format(activityReEntry, 'yyyy-MM-dd'),
      conversionReEntry: conversionReEntry ? format(conversionReEntry, 'yyyy-MM-dd') : null,
      sourceTimeline,
      activityWaitLabel: targetWait.label,
      conversionWaitLabel: isConversionMode ? getWaitConfig(originalRank).label : '',
      description: isConversionMode 
        ? `系統依據規則採計：(1) 原位階 ${originalRank === Rank.PREFERRED_CUSTOMER ? 'PC' : 'DS'} 自轉換日起算之等候期，與 (2) 目標位階自最後活動日起算之等候期，兩者取較晚者。`
        : `依據 ${targetRank === Rank.PREFERRED_CUSTOMER ? '優惠顧客' : '直銷商'} 規則自最後活動日起算等候期。`,
    };
  }, [lastActivityDate, conversionDate, isConversionMode, originalRank, targetRank]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans p-4 sm:p-12">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[80px]"></div>

      {/* Main Calculator Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-3xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-6 sm:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col gap-8">
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent italic">
                Advanced Re-Join Calculator
              </h1>
              <p className="text-white/40 text-[10px] tracking-widest uppercase font-medium">業務權益恢復試算系統 - 身份與活動雙軌版</p>
            </div>
            
            <button 
              onClick={() => setIsConversionMode(!isConversionMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase border transition-all ${
                isConversionMode 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              {isConversionMode ? '關閉轉換評估' : '開啟轉換評估'}
            </button>
          </header>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Original Context */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">原本位階</h2>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider ml-1">原本位階 (Original Rank)</label>
                <div className="relative group">
                  <select 
                    value={originalRank}
                    onChange={(e) => setOriginalRank(e.target.value as Rank)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-indigo-400 transition-colors text-lg text-white cursor-pointer"
                  >
                    <option value={Rank.SUPERVISOR} className="bg-slate-900">督導及以下 (DS)</option>
                    <option value={Rank.WORLD_TEAM} className="bg-slate-900">世界組及以上 (WT)</option>
                    <option value={Rank.PREFERRED_CUSTOMER} className="bg-slate-900">優惠顧客 (PC)</option>
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider ml-1">身份轉換日期 (Resignation Date)</label>
                <div className="relative group">
                  <input 
                    type="date" 
                    value={conversionDate}
                    onChange={(e) => setConversionDate(e.target.value)}
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-400 transition-colors text-lg text-white appearance-none ${!isConversionMode && 'opacity-50 pointer-events-none'}`}
                  />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>
              </div>
            </div>

            {/* Column 2: Activity Context */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></div>
                <h2 className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">活動行為與目標</h2>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider ml-1">轉換後目標位階 (Target Rank)</label>
                <div className="relative group">
                  <select 
                    value={targetRank}
                    onChange={(e) => setTargetRank(e.target.value as Rank)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-fuchsia-400 transition-colors text-lg text-white cursor-pointer"
                  >
                    <option value={Rank.PREFERRED_CUSTOMER} className="bg-slate-900">成為 優惠顧客 (PC)</option>
                    <option value={Rank.SUPERVISOR} className="bg-slate-900">成為 督導等級 (DS)</option>
                    <option value={Rank.WORLD_TEAM} className="bg-slate-900">成為 世界組等級 (WT)</option>
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider ml-1">最後業務行為日期 (Fact Activity)</label>
                <div className="relative group">
                  <input 
                    type="date" 
                    value={lastActivityDate}
                    onChange={(e) => setLastActivityDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-fuchsia-400 transition-colors text-lg text-white appearance-none"
                  />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Result Area */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${originalRank}-${targetRank}-${lastActivityDate}-${conversionDate}-${isConversionMode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 rounded-[32px] p-8 border border-white/5 flex flex-col items-center justify-center gap-6 text-center min-h-[280px]"
            >
              {calculationResult ? (
                <>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">符合重新加入資格日期</span>
                    <div className="flex items-baseline gap-2 sm:gap-4 flex-wrap justify-center font-mono text-white">
                      <span className="text-5xl sm:text-7xl font-black tracking-tighter">
                        {calculationResult.reEntryDate.split('-')[0]}
                      </span>
                      <span className="text-3xl sm:text-5xl font-light text-white/60">/</span>
                      <span className="text-5xl sm:text-7xl font-black tracking-tighter">
                        {calculationResult.reEntryDate.split('-')[1]}
                      </span>
                      <span className="text-3xl sm:text-5xl font-light text-white/60">/</span>
                      <span className="text-5xl sm:text-7xl font-black tracking-tighter">
                        {calculationResult.reEntryDate.split('-')[2]}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center">
                    <div className={`px-5 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
                      calculationResult.sourceTimeline === 'activity' 
                        ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200' 
                        : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                    }`}>
                      採計最晚日期：{calculationResult.sourceTimeline === 'activity' ? '活動行為端' : '身份轉換端'}
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                      <div className={`p-3 rounded-2xl border text-center transition-opacity ${calculationResult.sourceTimeline === 'activity' ? 'bg-white/10 border-white/20' : 'opacity-40 border-white/5'}`}>
                        <div className="text-[8px] text-white/40 uppercase font-bold mb-1">活動重入期 ({calculationResult.activityWaitLabel})</div>
                        <div className="text-xs font-mono font-bold text-white/80">{calculationResult.activityReEntry}</div>
                      </div>
                      <div className={`p-3 rounded-2xl border text-center transition-opacity ${calculationResult.sourceTimeline === 'conversion' ? 'bg-white/10 border-white/20' : 'opacity-40 border-white/5'} ${!isConversionMode && 'hidden'}`}>
                        <div className="text-[8px] text-white/40 uppercase font-bold mb-1">轉換重入期 ({calculationResult.conversionWaitLabel})</div>
                        <div className="text-xs font-mono font-bold text-white/80">{calculationResult.conversionReEntry}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 max-w-xl">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-100/70 text-left leading-relaxed">
                      {calculationResult.description} <br/>
                      <span className="text-white/40 italic">※ 等候期間不得以本人、配偶、共同生活家屬名義參與業務活動，否則等候期將重新起算或延長。</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 opacity-30">
                  <AlertCircle className="w-12 h-12" />
                  <p className="text-xs uppercase tracking-widest">請輸入正確日期與位階背景</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <p className="text-[9px] text-white/20 uppercase font-mono leading-tight">
                COMPLIANCE TOOL ENGINE v2.1.0<br/>
                REFERENCE: Dual Distributorship Procedure
              </p>
            </div>
            <button 
              onClick={() => {
                setLastActivityDate(format(new Date(), 'yyyy-MM-dd'));
                setConversionDate(format(new Date(), 'yyyy-MM-dd'));
                setIsConversionMode(true);
                setOriginalRank(Rank.SUPERVISOR);
                setTargetRank(Rank.PREFERRED_CUSTOMER);
              }}
              className="px-8 py-3 bg-white text-slate-900 font-black rounded-2xl hover:bg-white/90 transition-all text-[11px] uppercase tracking-[0.2em] shadow-[0_8px_16px_rgba(255,255,255,0.2)] active:scale-95"
            >
              Reset Calculation
            </button>
          </div>
        </div>
      </motion.div>

      {/* Admin Subtext */}
      <div className="mt-8 opacity-10 text-[8px] font-mono tracking-[0.5em] uppercase text-center px-4">
        Restricted Access // Business Process Monitoring System // Taiwan Region v2026
      </div>
    </div>
  );
}
