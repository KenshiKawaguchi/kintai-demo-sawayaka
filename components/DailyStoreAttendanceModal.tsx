import {
  displayDuration,
  displayTime,
} from "@/features/attendance/date";
import type { DailyStoreAttendanceRow } from "@/features/attendance/types";

function SlashDate({ value }: { value: string }) {
  return <>{value.replaceAll("-", "/")}</>;
}

export function DailyStoreAttendanceModal({
  date,
  rows,
  isLoading,
  onClose,
}: {
  date: string;
  rows: DailyStoreAttendanceRow[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const firstRow = rows[0];
  const storeLabel = firstRow
    ? `${firstRow.storeCode} ${firstRow.storeName}`.trim()
    : "所属店舗";
  const recordedCount = rows.filter((row) => row.hasRecord).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/5 px-3 py-5 [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace] sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="当日打刻確認"
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
            <table className="w-full min-w-[1240px] border-collapse text-center text-[15px] font-semibold text-zinc-700 sm:text-base">
              <thead>
                <tr>
                  <th
                    colSpan={13}
                    className="border border-[#20327d] bg-[#1519b8] px-3 py-2 text-lg font-bold text-white"
                  >
                    {storeLabel}：当日打刻確認
                  </th>
                </tr>
                <tr className="bg-[#6aa36a] text-white">
                  <th className="w-[17%] border border-zinc-600 px-3 py-2">勤務店舗</th>
                  <th className="w-[9%] border border-zinc-600 px-3 py-2">従業員コード</th>
                  <th className="w-[11%] border border-zinc-600 px-3 py-2">氏名</th>
                  <th className="w-[9%] border border-zinc-600 px-3 py-2">出勤日</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">出勤</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">退勤</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">外出1</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">戻り1</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">外出2</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">戻り2</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">外出3</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">戻り3</th>
                  <th className="w-[6%] border border-zinc-600 px-3 py-2">時間</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="h-9 bg-[#eeeeee]">
                    <td colSpan={13} className="border border-zinc-500 px-3">
                      読込中
                    </td>
                  </tr>
                ) : null}
                {!isLoading && rows.length === 0 ? (
                  <tr className="h-9 bg-[#eeeeee]">
                    <td colSpan={13} className="border border-zinc-500 px-3">
                      表示できる従業員がいません。
                    </td>
                  </tr>
                ) : null}
                {!isLoading
                  ? rows.map((row) => (
                      <tr key={row.employeeCode} className="h-9 bg-[#eeeeee]">
                        <td className="border border-zinc-500 px-3 text-left">
                          {`${row.storeCode} ${row.storeName}`.trim()}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {row.employeeCode}
                        </td>
                        <td className="border border-zinc-500 px-3 text-left">
                          {row.employeeName}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          <SlashDate value={date} />
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.clockIn)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.clockOut)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[0]?.out)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[0]?.back)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[1]?.out)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[1]?.back)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[2]?.out)}
                        </td>
                        <td className="border border-zinc-500 px-3">
                          {displayTime(row.outings[2]?.back)}
                        </td>
                        <td className="border border-zinc-500 px-3 text-right">
                          {displayDuration(row.hasRecord ? row : undefined)}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
              <tfoot>
                <tr className="h-9 bg-[#5c9957] text-white">
                  <td colSpan={12} className="border border-zinc-600 px-3 font-bold">
                    打刻人数
                  </td>
                  <td className="border border-zinc-600 px-3 text-right font-bold">
                    {recordedCount}/{rows.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-center px-[8%] pb-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-40 rounded-none border border-zinc-400 bg-gradient-to-b from-white to-[#d4d4d4] px-5 py-2 text-base font-bold text-zinc-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] active:translate-y-px"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
