export function MissingPunchCheckButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-2 text-center sm:text-left">
      <button
        type="button"
        className="rounded-none border border-zinc-400 bg-zinc-100 px-5 py-2 text-sm font-semibold shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace] active:translate-y-px sm:text-base"
        onClick={onClick}
      >
        打刻漏れ確認
      </button>
    </div>
  );
}
