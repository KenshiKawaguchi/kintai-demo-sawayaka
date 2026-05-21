import { displayDuration, displayTime } from "@/features/attendance/date";
import type { AttendanceRecord } from "@/features/attendance/types";

export function TodayTable({
  records,
  onMissingPunchCheck,
}: {
  records: AttendanceRecord[];
  onMissingPunchCheck: () => void;
}) {
  return (
    <section>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] border-2 border-black border-collapse bg-white text-center text-sm shadow-md sm:text-base">
          <thead>
            <tr className="bg-[#d92913] text-white">
              <th className="border-2 border-black px-3 py-2">出勤日</th>
              <th className="border-2 border-black px-3 py-2">出勤</th>
              <th className="border-2 border-black px-3 py-2">外出1</th>
              <th className="border-2 border-black px-3 py-2">戻り1</th>
              <th className="border-2 border-black px-3 py-2">外出2</th>
              <th className="border-2 border-black px-3 py-2">戻り2</th>
              <th className="border-2 border-black px-3 py-2">外出3</th>
              <th className="border-2 border-black px-3 py-2">戻り3</th>
              <th className="border-2 border-black px-3 py-2">退勤</th>
              <th className="border-2 border-black px-3 py-2">時間</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => (
                <tr key={record.id}>
                  <td className="border-2 border-black px-3 py-2">
                    {record.date.replaceAll("-", "/")}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.clockIn)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[0]?.out)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[0]?.back)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[1]?.out)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[1]?.back)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[2]?.out)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.outings[2]?.back)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayTime(record.clockOut)}
                  </td>
                  <td className="border-2 border-black px-3 py-2">
                    {displayDuration(record)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="border-2 border-black px-3 py-5 text-zinc-600"
                >
                  本日の打刻はまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          className="rounded-none border border-zinc-400 bg-zinc-100 px-5 py-2 text-sm font-semibold shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace] active:translate-y-px"
          onClick={onMissingPunchCheck}
        >
          打刻漏れ確認
        </button>
      </div>
    </section>
  );
}
