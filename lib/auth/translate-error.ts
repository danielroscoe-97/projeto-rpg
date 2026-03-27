/**
 * Maps raw Supabase auth error messages to i18n translation keys.
 *
 * Supabase returns English error messages regardless of locale.
 * This function matches known error patterns and returns the
 * corresponding translation key under the "auth_errors" namespace.
 */

const ERROR_MAP: Array<{ pattern: RegExp | string; key: string }> = [
  // Login
  { pattern: "Invalid login credentials", key: "invalid_credentials" },
  { pattern: "Email not confirmed", key: "email_not_confirmed" },
  { pattern: "Invalid Refresh Token", key: "session_expired" },
  { pattern: "User not found", key: "user_not_found" },

  // Signup
  { pattern: "User already registered", key: "user_already_registered" },
  { pattern: /already been registered/i, key: "user_already_registered" },
  { pattern: "Signup requires a valid password", key: "invalid_password" },
  { pattern: /unable to validate email/i, key: "invalid_email" },

  // Password
  { pattern: /password should be at least/i, key: "password_too_short" },
  { pattern: /password should be different/i, key: "password_same_as_old" },
  { pattern: /password should contain/i, key: "password_too_weak" },

  // Rate limiting
  { pattern: /rate limit/i, key: "rate_limit" },
  { pattern: /only request this once every/i, key: "rate_limit" },
  { pattern: /too many requests/i, key: "rate_limit" },
  { pattern: /email rate limit exceeded/i, key: "email_rate_limit" },
  { pattern: /over_email_send_rate_limit/i, key: "email_rate_limit" },

  // Session / Token
  { pattern: "Auth session missing", key: "session_expired" },
  { pattern: /session.*expired/i, key: "session_expired" },
  { pattern: /token.*expired/i, key: "link_expired" },
  { pattern: /token.*invalid/i, key: "link_invalid" },
  { pattern: /otp.*expired/i, key: "link_expired" },
  { pattern: /email link.*invalid/i, key: "link_invalid" },
  { pattern: /email link.*expired/i, key: "link_expired" },

  // PKCE
  { pattern: /code verifier/i, key: "link_invalid" },
  { pattern: /flow state.*expired/i, key: "link_expired" },
  { pattern: /flow state.*not found/i, key: "link_invalid" },
  { pattern: /pkce/i, key: "link_invalid" },

  // Network / unexpected
  { pattern: /fetch failed/i, key: "network_error" },
  { pattern: /failed to fetch/i, key: "network_error" },
  { pattern: /network/i, key: "network_error" },
  { pattern: /unexpected/i, key: "unexpected_error" },
  { pattern: /server error/i, key: "server_error" },
  { pattern: /database error/i, key: "server_error" },
  { pattern: /502/i, key: "server_error" },
  { pattern: /503/i, key: "server_error" },
  { pattern: /signups not allowed/i, key: "signups_disabled" },

  // Account
  { pattern: /user.*banned/i, key: "user_banned" },
  { pattern: "No token hash or type", key: "link_invalid" },
];

/**
 * Translates a raw Supabase error message to a user-friendly i18n key.
 * Returns the key under the "auth_errors" namespace, or null if no match.
 *
 * Usage with next-intl:
 *   const t = useTranslations("auth_errors");
 *   const key = getAuthErrorKey(error.message);
 *   setError(key ? t(key) : tc("error_generic"));
 */
export function getAuthErrorKey(message: string): string | null {
  for (const { pattern, key } of ERROR_MAP) {
    if (typeof pattern === "string") {
      if (message.includes(pattern)) return key;
    } else {
      if (pattern.test(message)) return key;
    }
  }
  return null;
}
