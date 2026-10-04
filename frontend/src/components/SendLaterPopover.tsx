import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface SendLaterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (date: Date) => void;
  currentTime?: Date | null;
}

export const SendLaterPopover: React.FC<SendLaterPopoverProps> = ({
  isOpen,
  onClose,
  onSelectTime,
  currentTime,
}) => {
  if (!isOpen) return null;

  // Format helper for tomorrow with hours
  const getTomorrowAt = (hour: number, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const presets = [
    { label: 'Tomorrow', date: getTomorrowAt(9, 0) },
    { label: 'Tomorrow, 10:00 AM', date: getTomorrowAt(10, 0) },
    { label: 'Tomorrow, 11:00 AM', date: getTomorrowAt(11, 0) },
    { label: 'Tomorrow, 3:00 PM', date: getTomorrowAt(15, 0) },
  ];

  // Custom date/time picker state
  const [customDateTime, setCustomDateTime] = useState<string>(
    currentTime
      ? new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ''
  );

  const handleDone = () => {
    if (customDateTime) {
      onSelectTime(new Date(customDateTime));
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">Send Later</h4>
        <Clock className="w-4 h-4 text-gray-400" />
      </div>

      {/* Date & Time Input matching Figma */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 font-medium flex items-center justify-between">
          <span>Pick date & time</span>
          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
        </label>
        <input
          type="datetime-local"
          value={customDateTime}
          onChange={(e) => setCustomDateTime(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-500 text-gray-800"
        />
      </div>

      {/* Quick Presets matching Figma Screenshot 4 */}
      <div className="space-y-1">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectTime(preset.date);
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Footer Buttons: Cancel & Done */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="px-4 py-1.5 text-xs font-semibold text-[#00A854] hover:bg-emerald-50 border border-[#00A854] rounded-full transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
