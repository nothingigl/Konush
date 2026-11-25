/**
 * Maps common Supabase Auth / network error messages to clear Russian messages for the UI.
 */
export function formatSupabaseAuthError(rawMessage: string): string {
  const normalized = rawMessage.trim().toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Почта ещё не подтверждена. Откройте письмо со ссылкой подтверждения или отключите Confirm email в настройках Supabase.';
  }
  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered')
  ) {
    return 'Аккаунт с этим email уже зарегистрирован. Переключитесь на вкладку «Вход».';
  }
  if (normalized.includes('password should be at least')) {
    return 'Пароль слишком короткий. Используйте не менее 6 символов.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Слишком много запросов. Подождите немного и попробуйте снова.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Не удалось связаться с сервером Supabase. Проверьте интернет и переменную NEXT_PUBLIC_SUPABASE_URL.';
  }

  return rawMessage;
}
