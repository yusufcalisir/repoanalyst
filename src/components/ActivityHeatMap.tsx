import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subWeeks, startOfWeek, addDays, isSameDay } from 'date-fns';

interface CommitActivityWeek {
    total: number;
    week: number; // Unix timestamp
    days: number[]; // Sun-Sat counts
}

interface ActivityHeatMapProps {
    activity: CommitActivityWeek[];
    totalCommits: number;
    hideFooter?: boolean;
}

const ActivityHeatMap: React.FC<ActivityHeatMapProps> = ({ activity, totalCommits, hideFooter }) => {
    // Generate the full grid for the last 52 weeks
    const grid = useMemo(() => {
        if (!activity || activity.length === 0) return null;

        // GitHub activity is 53 weeks to ensure full coverage of the year
        // We map the activity from backend which is already weekly
        return activity.map(week => ({
            weekStart: new Date(week.week * 1000),
            days: week.days.map((count, dayIndex) => {
                const date = addDays(new Date(week.week * 1000), dayIndex);
                return {
                    date,
                    count,
                    level: count === 0 ? 0 : count < 2 ? 1 : count < 5 ? 2 : count < 10 ? 3 : 4
                };
            })
        }));
    }, [activity]);

    if (!grid) {
        return (
            <div className="flex items-center justify-center p-8 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                <span className="text-muted text-sm italic">GitHub Stats are being computed...</span>
            </div>
        );
    }

    const getColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-white/5';
            case 1: return 'bg-green-500/20';
            case 2: return 'bg-green-500/40';
            case 3: return 'bg-green-500/70';
            case 4: return 'bg-green-500';
            default: return 'bg-white/5';
        }
    };

    // Calculate month labels and their positions (only for the first week of each month)
    const monthLabels = useMemo(() => {
        if (!grid) return [];
        const labels: { label: string; index: number }[] = [];
        let lastMonth = -1;

        grid.forEach((week, index) => {
            const firstDayOfMonth = week.days[0].date;
            const currentMonth = firstDayOfMonth.getMonth();
            if (currentMonth !== lastMonth) {
                labels.push({
                    label: format(firstDayOfMonth, 'MMM'),
                    index
                });
                lastMonth = currentMonth;
            }
        });
        return labels;
    }, [grid]);

    return (
        <div className="w-full space-y-4">
            <div className="flex items-start gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar min-h-[140px] px-1 touch-pan-x">
                {/* Y-AXIS: Vertical "DAYS" Label */}
                <div className="flex flex-col justify-center h-[105px] pr-1.5 select-none border-r border-white/5 shrink-0">
                    <div className="rotate-180 [writing-mode:vertical-lr] text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-white/20 py-2">
                        Days
                    </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                    {/* Grid */}
                    <div className="flex gap-[3px] md:gap-[4px]">
                        {grid.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[3px] md:gap-[4px]">
                                {week.days.map((day, dayIndex) => {
                                    const showBelow = dayIndex < 3;
                                    const isLeftEdge = weekIndex < 6;
                                    const isRightEdge = weekIndex > grid.length - 8;

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-[1px] md:rounded-[2px] ${getColor(day.level)} transition-colors group relative`}
                                        >
                                            {/* Tooltip */}
                                            <div
                                                className={`absolute z-50 hidden group-hover:block pointer-events-none transition-all duration-200
                                                    ${showBelow ? 'top-full mt-2' : 'bottom-full mb-2'}
                                                    ${isLeftEdge ? 'left-0' : isRightEdge ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                                            >
                                                <div className="bg-black/95 border border-white/20 px-3 py-2 rounded-lg shadow-2xl text-[10px] whitespace-nowrap text-white backdrop-blur-md ring-1 ring-white/10">
                                                    <span className="font-black text-green-400">{day.count} commits</span>
                                                    <span className="text-white/60 ml-2">on {format(day.date, 'MMM d, yyyy')}</span>
                                                </div>
                                                <div className={`w-2 h-2 bg-black/95 border-white/20 rotate-45 absolute
                                                    ${showBelow ? '-top-1 border-l border-t' : '-bottom-1 border-r border-b'}
                                                    ${isLeftEdge ? 'left-1.5' : isRightEdge ? 'right-1.5' : 'left-1/2 -translate-x-1/2'}`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* X-AXIS: Horizontal Month Labels */}
                    <div className="flex h-4 relative select-none">
                        {monthLabels.map((m, i) => (
                            <span
                                key={i}
                                className="absolute text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white/20"
                                style={{ left: `${m.index * (window.innerWidth < 768 ? 13 : 16)}px` }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>


            {/* Legend / Info Footer */}
            {!hideFooter && (
                <div className="pt-6 border-t border-white/5 space-y-6 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                Contribution Analysis
                            </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-medium pl-3.5 italic">
                            {totalCommits} significant commits identified in the last year
                        </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-3">
                        <div className="flex items-center gap-3 bg-white/[0.02] p-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] px-2">Intensity</span>
                            <div className="flex gap-[3px]">
                                {[0, 1, 2, 3, 4].map(level => (
                                    <div
                                        key={level}
                                        className={`w-3 h-3 rounded-[2px] ${getColor(level)} border border-white/5 transition-transform hover:scale-125 hover:z-10`}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 border-l border-white/5 ml-1">
                                <span className="text-[9px] text-white/30 lowercase italic">less</span>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] text-white/30 lowercase italic">more</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityHeatMap;
