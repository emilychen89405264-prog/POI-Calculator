/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { format, addYears, addDays, isValid, parseISO, isAfter, isBefore } from 'date-fns';
import { Calendar, Info, ChevronRight, AlertCircle, ArrowLeftRight, CreditCard, ShoppingCart, TrendingUp, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

enum Rank {
  SUPERVISOR = 'supervisor', // 督導及以下
  WORLD_TEAM = 'world_team', // 世界組及以上
  PREFERRED_CUSTOMER = 'preferred_customer', // 優惠顧客
}

export default function App() {
  const [conversionDate, setConversionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isConversionMode, setIsConversionMode] = useState<boolean>(false);
  const [originalRank, setOriginalRank] = useState<Rank>(Rank.SUPERVISOR);
  const [targetRank, setTargetRank] = useState<Rank>(Rank.PREFERRED_CUSTOMER);

  // New states for multiple activity dates
  const [apfDueDate, setApfDueDate] = useState<string>('');
  const [lastOrderDate, setLastOrderDate] = useState<string>('');
  const [lastEarningDate, setLastEarningDate] = useState<string>('');
  const [secondIdJoinDate, setSecondIdJoinDate] = useState<string>('');
  const [secondIdLastActivityDate, setSecondIdLastActivityDate] = useState<string>('');
  const [secondIdRank, setSecondIdRank] = useState<Rank>(Rank.SUPERVISOR);
  const [hwRealign, setHwRealign] = useState<boolean>(false);

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
    const activityDates = [
      apfDueDate ? parseISO(apfDueDate) : null,
      lastOrderDate ? parseISO(lastOrderDate) : null,
      lastEarningDate ? parseISO(lastEarningDate) : null
    ].filter((d): d is Date => d !== null && isValid(d));
    
    if (activityDates.length === 0) return null;

    const latestActivity = activityDates.reduce((prev, curr) => isAfter(curr, prev) ? curr : prev);
    const convDate = parseISO(conversionDate);

    const effectiveTargetRank = isConversionMode ? targetRank : originalRank;
    const targetWait = getWaitConfig(effectiveTargetRank);
    const activityReEntry = targetWait.years 
      ? addYears(latestActivity, targetWait.years)
      : addDays(latestActivity, targetWait.days);

    let finalReEntryDate = activityReEntry;
    let conversionReEntry: Date | null = null;
    let sourceTimeline: 'activity' | 'conversion' = 'activity';

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

    let caseClosedReEntryDate: string | null = null;
    let complianceStatus: 'unknown' | 'violation' | 'safe' = 'unknown';
    if (secondIdJoinDate) {
      const secondJoin = parseISO(secondIdJoinDate);
      if (isValid(secondJoin)) {
        if (isBefore(secondJoin, finalReEntryDate)) {
          complianceStatus = 'violation';
        } else {
          complianceStatus = 'safe';
        }
      }
    }

    if (complianceStatus === 'violation') {
      if (!isConversionMode && hwRealign) {
        let absoluteLatestActivity = latestActivity;
        if (secondIdLastActivityDate) {
          const id2Activity = parseISO(secondIdLastActivityDate);
          if (isValid(id2Activity) && isAfter(id2Activity, latestActivity)) {
            absoluteLatestActivity = id2Activity;
          }
        }
        
        const hwWait = getWaitConfig(secondIdRank);
        
        // H&W Realign violation: base wait from absolute latest activity (added once as per literal instructions "기간是180天, 1年或2年")
        const extendedDate = hwWait.years
          ? addYears(absoluteLatestActivity, hwWait.years)
          : addDays(absoluteLatestActivity, hwWait.days);
          
        caseClosedReEntryDate = format(extendedDate, 'yyyy-MM-dd');
      } else {
        const extendedDate = targetWait.years
          ? addYears(finalReEntryDate, targetWait.years)
          : addDays(finalReEntryDate, targetWait.days);
        caseClosedReEntryDate = format(extendedDate, 'yyyy-MM-dd');
      }
    }

    return {
      reEntryDate: format(finalReEntryDate, 'yyyy-MM-dd'),
      latestActivityDate: format(latestActivity, 'yyyy-MM-dd'),
      activityReEntry: format(activityReEntry, 'yyyy-MM-dd'),
      conversionReEntry: conversionReEntry ? format(conversionReEntry, 'yyyy-MM-dd') : null,
      caseClosedReEntryDate,
      sourceTimeline,
      complianceStatus,
      activityWaitLabel: targetWait.label,
      conversionWaitLabel: isConversionMode ? getWaitConfig(originalRank).label : '',
      description: isConversionMode 
        ? `系統依據規則採計：(1) 原位階 ${originalRank === Rank.PREFERRED_CUSTOMER ? 'PC' : 'DS'} 自轉換日起算之等候期，與 (2) 目標位階自最後活動日起算之等候期，兩者取較晚者。`
        : `依據 ${effectiveTargetRank === Rank.PREFERRED_CUSTOMER ? '優惠顧客' : '直銷商'} 規則自最後活動日起算等候期。`,
    };
  }, [apfDueDate, lastOrderDate, lastEarningDate, conversionDate, isConversionMode, originalRank, targetRank, secondIdJoinDate, secondIdLastActivityDate, hwRealign, secondIdRank]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans p-4 sm:p-12">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-3xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-6 sm:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col gap-8">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent italic">
                POI Calculator
              </h1>
              <p className="text-white/40 text-[12px] tracking-widest uppercase font-medium">POI Calculator</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column: 1st ID Fields */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <h2 className="text-lg font-bold text-indigo-300 uppercase tracking-widest">1st ID & 轉換</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-white/30 uppercase font-bold tracking-tighter">會員身份轉換?</span>
                  <button 
                    onClick={() => setIsConversionMode(!isConversionMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isConversionMode ? 'bg-indigo-500' : 'bg-white/10'}`}
                  >
                    <motion.div animate={{ x: isConversionMode ? 20 : 2 }} className="absolute top-1 left-3 w-3 h-3 bg-white rounded-full shadow-sm" />
                  </button>
                  <span className="text-[12px] font-bold text-indigo-300">{isConversionMode ? 'YES' : 'NO'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-semibold text-white/50 uppercase tracking-wider ml-1">1st ID Team</label>
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

              <AnimatePresence>
                {isConversionMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 border-l-2 border-fuchsia-500/30 pl-4 mt-2 overflow-hidden">
                    <label className="text-[12px] font-semibold text-fuchsia-300 uppercase tracking-wider ml-1">身份轉換日期 (Resignation Date)</label>
                    <div className="relative group pb-4">
                      <input type="date" value={conversionDate} onChange={(e) => setConversionDate(e.target.value)} className="w-full bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-2xl px-5 py-4 focus:outline-none focus:border-fuchsia-400 transition-colors text-lg text-white appearance-none" />
                      <ArrowLeftRight className="absolute right-5 top-4 w-5 h-5 text-fuchsia-400/30 group-focus-within:text-fuchsia-400 transition-colors pointer-events-none" />
                    </div>
                    <label className="text-[12px] font-semibold text-fuchsia-300 uppercase tracking-wider ml-1">目標重入位階 (Target Rank)</label>
                    <div className="relative group mt-2">
                      <select value={targetRank} onChange={(e) => setTargetRank(e.target.value as Rank)} className="w-full bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-fuchsia-400 transition-colors text-lg text-white cursor-pointer">
                        <option value={Rank.PREFERRED_CUSTOMER} className="bg-slate-900">成為 優惠顧客 (PC)</option>
                        <option value={Rank.SUPERVISOR} className="bg-slate-900">成為 督導等級 (DS)</option>
                        <option value={Rank.WORLD_TEAM} className="bg-slate-900">成為 世界組等級 (WT)</option>
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-400/30 rotate-90 pointer-events-none" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px w-full bg-white/5 my-4"></div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></div>
                <h2 className="text-sm font-bold text-fuchsia-300 uppercase tracking-widest">Activity</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-white/40 uppercase tracking-widest px-1">1. APF Due Date</label>
                  <div className="relative">
                    <input type="date" value={apfDueDate} onChange={e => setApfDueDate(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 transition-all text-white appearance-none" />
                    <CreditCard className="absolute right-4 top-3.5 w-4 h-4 text-white/20 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-white/40 uppercase tracking-widest px-1">2. Order Date</label>
                  <div className="relative">
                    <input type="date" value={lastOrderDate} onChange={e => setLastOrderDate(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 transition-all text-white appearance-none" />
                    <ShoppingCart className="absolute right-4 top-3.5 w-4 h-4 text-white/20 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-white/40 uppercase tracking-widest px-1">3. Earning Date</label>
                  <div className="relative">
                    <input type="date" value={lastEarningDate} onChange={e => setLastEarningDate(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 transition-all text-white appearance-none" />
                    <TrendingUp className="absolute right-4 top-3.5 w-4 h-4 text-white/20 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 2nd ID Fields */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4 h-6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <h2 className="text-lg font-bold text-emerald-300 uppercase tracking-widest">2nd ID</h2>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-semibold text-emerald-400/70 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> 2nd ID App. date
                </label>
                <div className="relative group">
                  <input type="date" value={secondIdJoinDate} onChange={(e) => setSecondIdJoinDate(e.target.value)} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-400 transition-colors text-lg text-white appearance-none" />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/30 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-semibold text-emerald-400/70 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> 2nd ID last activity date
                </label>
                <div className="relative group">
                  <input type="date" value={secondIdLastActivityDate} onChange={(e) => setSecondIdLastActivityDate(e.target.value)} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-400 transition-colors text-lg text-white appearance-none" />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/30 pointer-events-none" />
                </div>
              </div>

              <AnimatePresence>
                {!isConversionMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                    <div className="pt-2">
                      <label className="text-[12px] font-semibold text-emerald-400/70 uppercase tracking-wider ml-1">2nd ID team</label>
                      <div className="relative group mt-2">
                        <select value={secondIdRank} onChange={(e) => setSecondIdRank(e.target.value as Rank)} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-emerald-400 transition-colors text-lg text-white cursor-pointer">
                          <option value={Rank.SUPERVISOR} className="bg-slate-900">督導及以下 (DS)</option>
                          <option value={Rank.WORLD_TEAM} className="bg-slate-900">世界組及以上 (WT)</option>
                          <option value={Rank.PREFERRED_CUSTOMER} className="bg-slate-900">優惠顧客 (PC)</option>
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/30 rotate-90 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-5 py-4 mt-4">
                      <div className="flex flex-col">
                        <label className="text-[12px] font-bold text-emerald-400/70 uppercase tracking-wider">H&W Realign</label>
                        <span className="text-[12px] text-emerald-400/50">重新對齊夫妻等候期</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setHwRealign(!hwRealign)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${hwRealign ? 'bg-emerald-500' : 'bg-black/20'}`}
                        >
                          <motion.div animate={{ x: hwRealign ? 20 : 2 }} className="absolute top-1 left-[2px] w-3 h-3 bg-white rounded-full shadow-sm" />
                        </button>
                        <span className="text-[12px] font-bold text-emerald-300 w-6">{hwRealign ? 'YES' : 'NO'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`${originalRank}-${targetRank}-${conversionDate}-${isConversionMode}-${apfDueDate}-${lastOrderDate}-${lastEarningDate}-${secondIdJoinDate}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 rounded-[32px] p-8 border border-white/5 flex flex-col items-center justify-center gap-6 text-center min-h-[320px]"
            >
              {calculationResult ? (
                <>
                  <div className="space-y-6 w-full">
                    <div className="space-y-2">
                      <span className="text-[12px] font-bold text-white/40 uppercase tracking-[0.3em]">最終符合重新加入資格日期 (ID1)</span>
                      <div className="flex items-baseline gap-2 sm:gap-4 flex-wrap justify-center font-mono text-white">
                        <span className="text-5xl sm:text-7xl font-black tracking-tighter">{calculationResult.reEntryDate.split('-')[0]}</span>
                        <span className="text-3xl sm:text-5xl font-light text-white/60">/</span>
                        <span className="text-5xl sm:text-7xl font-black tracking-tighter">{calculationResult.reEntryDate.split('-')[1]}</span>
                        <span className="text-3xl sm:text-5xl font-light text-white/60">/</span>
                        <span className="text-5xl sm:text-7xl font-black tracking-tighter">{calculationResult.reEntryDate.split('-')[2]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center w-full">
                    <div className={`px-5 py-2 rounded-full border text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 ${calculationResult.sourceTimeline === 'activity' ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'}`}>
                      {calculationResult.sourceTimeline === 'activity' ? <AlertCircle className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                      {calculationResult.sourceTimeline === 'activity' ? '無身份轉換' : '身份轉換'}
                    </div>

                    {secondIdJoinDate && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`flex flex-col items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 w-full max-w-sm transition-all shadow-lg ${calculationResult.complianceStatus === 'violation' ? 'bg-red-500/10 border-red-500/40 text-red-100' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'}`}>
                        <div className="flex items-center gap-3">
                          {calculationResult.complianceStatus === 'violation' ? <ShieldAlert className="w-8 h-8 text-red-500" /> : <ShieldCheck className="w-8 h-8 text-emerald-500" />}
                          <p className={`text-xl font-black ${calculationResult.complianceStatus === 'violation' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {calculationResult.complianceStatus === 'violation' ? 'DD違規' : '無違規'}
                          </p>
                        </div>
                        {calculationResult.complianceStatus === 'violation' && calculationResult.caseClosedReEntryDate && (
                          <div className="mt-2 text-center w-full bg-black/20 rounded-xl p-3 border border-red-500/20">
                             <div className="text-[12px] uppercase font-bold tracking-widest text-red-300/80 mb-1">結案後可重新加入日期</div>
                             <div className="text-xl font-mono font-bold text-red-200">{calculationResult.caseClosedReEntryDate}</div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 max-w-xl text-left">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-100/70 leading-relaxed">
                      {calculationResult.description} <br/>
                      <span className="text-white/40 italic">※ 等候期間不得以本人、配偶、共同生活家屬名義參與業務活動。若有 ID2，申請日期必須晚於 ID1 符合重入日期。</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 opacity-30">
                  <AlertCircle className="w-12 h-12" />
                  <p className="text-sm uppercase tracking-widest">請輸入業務或轉換日期</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/5 pt-8">
            <p className="text-[9px] text-white/20 uppercase font-mono leading-tight text-center sm:text-left">
              COMPLIANCE ENGINE v2.2.0<br/>
              TRANSITION & MULTI-ID VERIFICATION ACTIVE
            </p>
            <button 
              onClick={() => {
                setApfDueDate('');
                setLastOrderDate('');
                setLastEarningDate('');
                setConversionDate(format(new Date(), 'yyyy-MM-dd'));
                setIsConversionMode(false);
                setOriginalRank(Rank.SUPERVISOR);
                setTargetRank(Rank.PREFERRED_CUSTOMER);
                setSecondIdJoinDate('');
                setSecondIdLastActivityDate('');
                setHwRealign(false);
                setSecondIdRank(Rank.SUPERVISOR);
              }}
              className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-white/90 transition-all text-sm uppercase tracking-[0.2em] shadow-lg active:scale-95"
            >
              Reset Data
            </button>
          </footer>
        </div>
      </motion.div>
      <div className="mt-8 opacity-10 text-[8px] font-mono tracking-[0.5em] uppercase text-center px-4">
        Restricted Access // Taiwan Business Compliance Monitor
      </div>
    </div>
  );
}
