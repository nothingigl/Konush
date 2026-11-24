'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAppState } from '@/components/providers/app-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const { profile, supabaseEnabled, triggerSync } = useAppState();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMessage(null);

    const supabase = await getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg(
        'Облачная синхронизация Supabase ещё не подключена в .env.local. Вы можете заниматься в гостевом режиме.',
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: displayName.trim() || email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        if (data.session) {
          await triggerSync();
          router.push('/');
        } else {
          setMessage(
            'Проверьте вашу почту для подтверждения аккаунта. После входа ваш локальный прогресс автоматически перенесётся в профиль.',
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        await triggerSync();
        router.push('/');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    const supabase = await getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg('Supabase не настроен в переменных окружения.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">
          {mode === 'signin' ? 'Вход в профиль' : 'Создание профиля'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Весь прогресс, который вы уже прошли в гостевом режиме, автоматически сохранится и
          объединится с вашим облачным аккаунтом.
        </p>

        {!supabaseEnabled && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            <strong>Локальный/гостевой режим:</strong> Переменные{' '}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> и <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ещё
            не заданы. Все уроки и сохранение прогресса в браузере (IndexedDB) работают полностью, а
            после добавления ключей Supabase включится синхронизация между устройствами.
          </div>
        )}

        {profile.userId && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Вы уже вошли как <strong>{profile.email ?? profile.displayName}</strong>.{' '}
            <Link href="/profile" className="underline">
              Перейти в профиль →
            </Link>
          </div>
        )}

        <div className="mt-5 flex rounded-xl bg-slate-100 p-1 text-sm font-medium dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-lg py-2 ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-lg py-2 ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={(e) => void handleEmailAuth(e)} className="mt-4 space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold uppercase">
                Имя для показа
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Например, Айгуль"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase">
              Электронная почта (Email)
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не менее 6 символов"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-200"
            >
              {errorMsg}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-600 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading
              ? 'Подождите...'
              : mode === 'signin'
                ? 'Войти и синхронизировать'
                : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span>или</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          Войти через Google
        </button>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Продолжить без регистрации (гостевой режим) →
          </Link>
        </div>
      </div>
    </main>
  );
}
