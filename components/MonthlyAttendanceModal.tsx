import {
  displayDuration,
  displayTime,
  formatMinutes,
} from "@/features/attendance/date";
import type { AttendanceRecord } from "@/features/attendance/types";

function getMonthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${month}-${day}`;
  });
}

function SlashDate({ value }: { value: string }) {
  return <>{value.replaceAll("-", "/")}</>;
}

export function MonthlyAttendanceModal({
  employeeName,
  month,
  records,
  totalMinutes,
  onPreviousMonth,
  onNextMonth,
  onClose,
}: {
  employeeName: string;
  month: string;
  records: AttendanceRecord[];
  totalMinutes: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onClose: () => void;
}) {
  const recordsByDate = new Map(records.map((record) => [record.date, record]));
  const monthDates = getMonthDates(month);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/5 px-3 py-5 [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace] sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="確認"
    >
      <div className="flex h-[78dvh] max-h-[760px] w-full max-w-[1280px] flex-col overflow-hidden rounded-[3px] border border-zinc-500 bg-[#ededed] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="flex min-h-11 items-center justify-between border border-zinc-400 bg-gradient-to-b from-[#f7f7f7] to-[#c8c8c8] px-4 text-xl font-bold text-zinc-950">
          <span>確認</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-none border-0 bg-transparent text-3xl font-bold leading-none text-zinc-900 active:translate-y-px"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-4 pt-4">
          <div className="min-h-0 flex-1 overflow-auto border border-zinc-500 bg-white">
            <table className="w-full min-w-[1060px] border-collapse text-center text-[15px] font-semibold text-zinc-700 sm:text-base">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th
                    colSpan={11}
                    className="border border-[#20327d] bg-[#1519b8] px-3 py-2 text-lg font-bold text-white"
                  >
                    {employeeName}：打刻実績
                  </th>
                </tr>
                <tr className="bg-[#6aa36a] text-white">
                  <th className="w-[22%] border border-zinc-600 px-3 py-2">勤務店舗</th>
                  <th className="w-[11%] border border-zinc-600 px-3 py-2">出勤日</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">出勤</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">退勤</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">外出1</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">戻り1</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">外出2</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">戻り2</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">外出3</th>
                  <th className="w-[7%] border border-zinc-600 px-3 py-2">戻り3</th>
                  <th className="w-[8%] border border-zinc-600 px-3 py-2">時間</th>
                </tr>
              </thead>
              <tbody>
                {monthDates.map((date) => {
                  const record = recordsByDate.get(date);
                  const hasRecord = Boolean(record);

                  return (
                    <tr key={date} className="h-9 bg-[#eeeeee]">
                      <td className="border border-zinc-500 px-3 text-left">
                        {hasRecord ? `${record?.storeCode} ${record?.storeName}`.trim() : ""}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        <SlashDate value={date} />
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.clockIn)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.clockOut)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[0]?.out)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[0]?.back)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[1]?.out)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[1]?.back)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[2]?.out)}
                      </td>
                      <td className="border border-zinc-500 px-3">
                        {displayTime(record?.outings[2]?.back)}
                      </td>
                      <td className="border border-zinc-500 px-3 text-right italic">
                        {displayDuration(record)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 z-10">
                <tr className="h-9 bg-[#5c9957] text-white">
                  <td colSpan={10} className="border border-zinc-600 px-3 font-bold">
                    期間合計
                  </td>
                  <td className="border border-zinc-600 px-3 text-right font-bold">
                    {formatMinutes(totalMinutes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 items-center gap-6 px-[8%] pb-1">
            <button
              type="button"
              onClick={onPreviousMonth}
              className="min-h-11 w-1/2 min-w-24 justify-self-center rounded-none border border-zinc-400 bg-gradient-to-b from-white to-[#d4d4d4] px-5 py-2 text-base font-bold text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] active:translate-y-px"
            >
              前 月
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 w-1/2 min-w-24 justify-self-center rounded-none border border-zinc-400 bg-gradient-to-b from-white to-[#d4d4d4] px-5 py-2 text-base font-bold text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] active:translate-y-px"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="min-h-11 w-1/2 min-w-24 justify-self-center rounded-none border border-zinc-400 bg-gradient-to-b from-white to-[#d4d4d4] px-5 py-2 text-base font-bold text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] active:translate-y-px"
            >
              翌 月
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
