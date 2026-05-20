"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Store = {
  id: string;
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

function storeName(employee: Employee) {
  const store = Array.isArray(employee.stores) ? employee.stores[0] : employee.stores;
  return store?.name ?? "";
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
  const [newStoreName, setNewStoreName] = useState("");
  const [employeeForm, setEmployeeForm] = useState({
    id: "",
    storeId: "",
    employeeCode: "",
    name: "",
    active: true,
  });

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

  async function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const store = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStoreName }),
      }).then((response) => readJson<Store>(response));
      setStores((current) => [...current, store].sort((a, b) => a.name.localeCompare(b.name)));
      setNewStoreName("");
      setMessage("店舗を追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店舗の追加に失敗しました。");
    }
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
            <p className="mt-1 text-sm text-zinc-600">店舗と従業員情報を管理します。</p>
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

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            className="border border-zinc-400 bg-white p-4 shadow"
            onSubmit={handleCreateStore}
          >
            <h2 className="text-xl font-bold">店舗追加</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="font-semibold">店舗名</span>
                <input
                  className={inputClass}
                  value={newStoreName}
                  onChange={(event) => setNewStoreName(event.target.value)}
                  required
                />
              </label>
              <button className={buttonClass} type="submit">
                店舗を追加
              </button>
            </div>
          </form>

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
                      {store.name}
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">従業員一覧</h2>
            <button className={buttonClass} type="button" onClick={() => void loadAdminData()}>
              再読込
            </button>
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
                {employees.length > 0 ? (
                  employees.map((employee) => (
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
                        <button
                          className={buttonClass}
                          type="button"
                          onClick={() => startEdit(employee)}
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-zinc-400 px-3 py-6 text-center" colSpan={5}>
                      {isLoading ? "読み込み中です。" : "従業員が登録されていません。"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
