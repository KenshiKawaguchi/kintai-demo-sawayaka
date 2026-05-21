"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Store = {
  id: string;
  store_code: string;
  name: string;
};

type Employee = {
  id: string;
  store_id: string;
  employee_code: string;
  name: string;
  active: boolean;
  stores?: Store | Store[] | null;
};

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

const inputClass =
  "min-h-11 rounded-none border border-zinc-400 bg-white px-3 py-2 text-base outline-none focus:border-zinc-950";
const buttonClass =
  "min-h-11 rounded-none border border-zinc-500 bg-zinc-100 px-5 py-2 text-base font-semibold shadow active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const dangerButtonClass =
  "min-h-11 rounded-none border border-red-800 bg-red-700 px-5 py-2 text-base font-semibold text-white shadow active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

function storeName(employee: Employee) {
  const store = Array.isArray(employee.stores) ? employee.stores[0] : employee.stores;
  return store ? `${store.store_code} ${store.name}` : "";
}

async function readJson<T>(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.ok || body.data === undefined) {
    throw new Error(body?.message ?? "処理に失敗しました。");
  }
  return body.data;
}

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    id: "",
    storeId: "",
    employeeCode: "",
    name: "",
    active: true,
  });
  const filteredEmployees = useMemo(
    () =>
      selectedStoreFilter
        ? employees.filter((employee) => employee.store_id === selectedStoreFilter)
        : employees,
    [employees, selectedStoreFilter],
  );

  async function loadAdminData() {
    setIsLoading(true);
    setMessage("");
    try {
      const [storeData, employeeData] = await Promise.all([
        fetch("/api/admin/stores").then((response) => readJson<Store[]>(response)),
        fetch("/api/admin/employees").then((response) => readJson<Employee[]>(response)),
      ]);
      setStores(storeData);
      setEmployees(employeeData);
      setEmployeeForm((current) => ({
        ...current,
        storeId: current.storeId || storeData[0]?.id || "",
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "管理情報の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const hasSession = Boolean(data.session);
      setIsLoggedIn(hasSession);
      if (hasSession) {
        void loadAdminData();
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      if (session) {
        void loadAdminData();
      } else {
        setStores([]);
        setEmployees([]);
        setSelectedStoreFilter("");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("ログインに失敗しました。");
      setIsLoading(false);
      return;
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setMessage("");
  }

  async function handleSaveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEditing = Boolean(employeeForm.id);
    try {
      const employee = await fetch("/api/admin/employees", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: employeeForm.id || undefined,
          storeId: employeeForm.storeId,
          employeeCode: employeeForm.employeeCode,
          name: employeeForm.name,
          active: employeeForm.active,
        }),
      }).then((response) => readJson<Employee>(response));

      setEmployees((current) => {
        const next = isEditing
          ? current.map((item) => (item.id === employee.id ? employee : item))
          : [...current, employee];
        return next.sort((a, b) => a.employee_code.localeCompare(b.employee_code));
      });
      setEmployeeForm({
        id: "",
        storeId: stores[0]?.id || "",
        employeeCode: "",
        name: "",
        active: true,
      });
      setMessage(isEditing ? "従業員を更新しました。" : "従業員を追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "従業員の保存に失敗しました。");
    }
  }

  async function handleDeleteEmployee() {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    setMessage("");
    try {
      const deleted = await fetch("/api/admin/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      }).then((response) => readJson<{ id: string }>(response));

      setEmployees((current) =>
        current.filter((employee) => employee.id !== deleted.id),
      );
      setEmployeeForm((current) =>
        current.id === deleted.id
          ? {
              id: "",
              storeId: stores[0]?.id || "",
              employeeCode: "",
              name: "",
              active: true,
            }
          : current,
      );
      setDeleteTarget(null);
      setMessage("従業員を削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "従業員の削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  }

  function startEdit(employee: Employee) {
    setEmployeeForm({
      id: employee.id,
      storeId: employee.store_id,
      employeeCode: employee.employee_code,
      name: employee.name,
      active: employee.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-dvh bg-zinc-100 p-4 text-zinc-950 [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]">
        <section className="mx-auto mt-12 max-w-md border border-zinc-400 bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">管理者ログイン</h1>
          <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
            <label className="grid gap-2">
              <span className="font-semibold">メールアドレス</span>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="font-semibold">パスワード</span>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className={buttonClass} type="submit" disabled={isLoading}>
              ログイン
            </button>
          </form>
          {message ? <p className="mt-4 font-semibold text-red-700">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-zinc-100 p-4 text-zinc-950 [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border border-zinc-400 bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">管理者画面</h1>
            <p className="mt-1 text-sm text-zinc-600">従業員情報を管理します。</p>
          </div>
          <button className={buttonClass} type="button" onClick={handleLogout}>
            ログアウト
          </button>
        </header>

        {message ? (
          <p className="border border-zinc-300 bg-white px-4 py-3 font-semibold shadow">
            {message}
          </p>
        ) : null}

        <section className="grid gap-5">
          <form
            className="border border-zinc-400 bg-white p-4 shadow"
            onSubmit={handleSaveEmployee}
          >
            <h2 className="text-xl font-bold">
              {employeeForm.id ? "従業員更新" : "従業員追加"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="font-semibold">所属店舗</span>
                <select
                  className={inputClass}
                  value={employeeForm.storeId}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      storeId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">選択してください</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.store_code} {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="font-semibold">従業員コード</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  pattern="[0-9]{7}"
                  maxLength={7}
                  value={employeeForm.employeeCode}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      employeeCode: event.target.value.replace(/\D/g, "").slice(0, 7),
                    }))
                  }
                  required
                />
              </label>
              <label className="grid gap-2">
                <span className="font-semibold">氏名</span>
                <input
                  className={inputClass}
                  value={employeeForm.name}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex items-center gap-3 pt-7 font-semibold">
                <input
                  type="checkbox"
                  checked={employeeForm.active}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                有効
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className={buttonClass} type="submit">
                {employeeForm.id ? "更新" : "追加"}
              </button>
              {employeeForm.id ? (
                <button
                  className={buttonClass}
                  type="button"
                  onClick={() =>
                    setEmployeeForm({
                      id: "",
                      storeId: stores[0]?.id || "",
                      employeeCode: "",
                      name: "",
                      active: true,
                    })
                  }
                >
                  取消
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="border border-zinc-400 bg-white p-4 shadow">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">従業員一覧</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-600">
                表示件数 {filteredEmployees.length} / {employees.length}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid gap-2">
                <span className="font-semibold">所属店舗で絞り込み</span>
                <select
                  className={inputClass}
                  value={selectedStoreFilter}
                  onChange={(event) => setSelectedStoreFilter(event.target.value)}
                >
                  <option value="">すべての店舗</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.store_code} {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className={buttonClass} type="button" onClick={() => void loadAdminData()}>
                再読込
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-zinc-900 text-white">
                  <th className="border border-zinc-500 px-3 py-2">コード</th>
                  <th className="border border-zinc-500 px-3 py-2">氏名</th>
                  <th className="border border-zinc-500 px-3 py-2">所属店舗</th>
                  <th className="border border-zinc-500 px-3 py-2">状態</th>
                  <th className="border border-zinc-500 px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="border border-zinc-400 px-3 py-2">
                        {employee.employee_code}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2">
                        {employee.name}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2">
                        {storeName(employee)}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2">
                        {employee.active ? "有効" : "無効"}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={buttonClass}
                            type="button"
                            onClick={() => startEdit(employee)}
                          >
                            編集
                          </button>
                          <button
                            className={dangerButtonClass}
                            type="button"
                            onClick={() => setDeleteTarget(employee)}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-zinc-400 px-3 py-6 text-center" colSpan={5}>
                      {isLoading
                        ? "読み込み中です。"
                        : selectedStoreFilter
                          ? "選択した所属店舗の従業員が登録されていません。"
                          : "従業員が登録されていません。"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="従業員削除確認"
        >
          <section className="w-full max-w-md border border-zinc-500 bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold">従業員削除確認</h2>
            <p className="mt-4 font-semibold">
              次の従業員を削除します。よろしいですか。
            </p>
            <dl className="mt-4 grid gap-2 border border-zinc-300 bg-zinc-50 p-3">
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <dt className="font-semibold">コード</dt>
                <dd>{deleteTarget.employee_code}</dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <dt className="font-semibold">氏名</dt>
                <dd>{deleteTarget.name}</dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <dt className="font-semibold">所属店舗</dt>
                <dd>{storeName(deleteTarget)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm font-semibold text-red-700">
              打刻履歴がある従業員は削除できません。
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className={buttonClass}
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                className={dangerButtonClass}
                type="button"
                onClick={() => void handleDeleteEmployee()}
                disabled={isDeleting}
              >
                {isDeleting ? "削除中" : "削除する"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
