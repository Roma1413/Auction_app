import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { getTimeRemaining } from '../utils/timeFormat';
import type { TimeRemaining } from '../utils/timeFormat';

interface CountdownTimerProps {
  endTime: string;
  compact?: boolean;
  onEnd?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, compact = false, onEnd }) => {
  const [time, setTime] = useState<TimeRemaining>(() => getTimeRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(endTime);
      setTime(remaining);
      if (remaining.isEnded && onEnd) {
        onEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onEnd]);

  if (time.isEnded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
        <AlertCircle className="w-3.5 h-3.5" />
        Auction Ended
      </span>
    );
  }

  const isEndingSoon = time.totalMs < 30 * 60 * 1000; // < 30 minutes
  const isUrgent = time.totalMs < 5 * 60 * 1000; // < 5 minutes

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
        isUrgent 
          ? 'bg-red-500 text-white animate-pulse' 
          : isEndingSoon 
            ? 'bg-amber-500 text-white' 
            : 'bg-slate-900/80 text-white backdrop-blur-xs'
      }`}>
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>
          {time.days > 0 ? `${time.days}d ` : ''}
          {String(time.hours).padStart(2, '0')}h {String(time.minutes).padStart(2, '0')}m {String(time.seconds).padStart(2, '0')}s
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${
      isUrgent
        ? 'bg-red-50 border-red-200 text-red-900'
        : isEndingSoon
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-slate-900 text-white border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isEndingSoon ? 'bg-red-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isEndingSoon ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {isUrgent ? 'HOT ITEM - ENDING VERY SOON' : isEndingSoon ? 'ENDING SOON' : 'LIVE AUCTION COUNTDOWN'}
          </span>
        </div>
        <Clock className="w-4 h-4 opacity-75" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-black/20 rounded-lg p-2 backdrop-blur-xs">
          <div className="text-2xl font-black">{time.days}</div>
          <div className="text-[10px] uppercase font-semibold opacity-75">Days</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 backdrop-blur-xs">
          <div className="text-2xl font-black">{String(time.hours).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase font-semibold opacity-75">Hours</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 backdrop-blur-xs">
          <div className="text-2xl font-black">{String(time.minutes).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase font-semibold opacity-75">Mins</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 backdrop-blur-xs">
          <div className="text-2xl font-black">{String(time.seconds).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase font-semibold opacity-75">Secs</div>
        </div>
      </div>
    </div>
  );
};
