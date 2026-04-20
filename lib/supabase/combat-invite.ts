import { createClient } from "@/lib/supabase/client";

/**
 * Wave 5 (F19) — Client helper para disparar auto-invite pro combate.
 *
 * Chamado pelo DM em `CombatSessionClient.handleStartCombat` logo após o
 * `broadcastEvent("session:state_sync")`. Fire-and-forget (não bloqueia UX).
 * Server endpoint valida posse da sessão e garante que Quick Combat
 * (campaign_id=null) retorna 204 sem side effects.
 *
 * Combat Parity: Auth-only. Guest/anon não chamam (não têm access token).
 */

export interface DispatchCombatInviteArgs {
  /** sessions.id recém-criada (caminho B) ou existente (caminho A). */
  sessionId: string;
  /** encounters.id associado — para prefetch de combatants no player side. */
  encounterId: string;
}

export interface DispatchCombatInviteResult {
  ok: boolean;
  status: number;
  /** Quantidade de players notificados (exceto DM). 0 em Quick Combat. */
  notified?: number;
  /** Token de join ativo (reusado ou criado). undefined em 204/erro. */
  join_token?: string;
  error?: string;
}

/**
 * Dispara o auto-invite. Não throws — retorna `{ ok: false, ... }` em erro
 * para que o chamador possa seguir o happy path do startCombat.
 */
export async function dispatchCombatInvite(
  args: DispatchCombatInviteArgs,
): Promise<DispatchCombatInviteResult> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      // Sem auth = guest/anon path. Honra Combat Parity (não dispara).
      return { ok: false, status: 401, error: "no_access_token" };
    }

    const res = await fetch("/api/combat/invite/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sessionId: args.sessionId,
        encounterId: args.encounterId,
      }),
      // Não esperamos muito — UI já mostrou o combate.
      cache: "no-store",
    });

    // 204 = Quick Combat (campaign_id null) — succeed silently.
    if (res.status === 204) {
      return { ok: true, status: 204, notified: 0 };
    }

    if (!res.ok) {
      let err = `http_${res.status}`;
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error) err = j.error;
      } catch {
        /* ignore */
      }
      return { ok: false, status: res.status, error: err };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      notified?: number;
      join_token?: string;
    };
    return {
      ok: json.ok === true,
      status: res.status,
      notified: json.notified,
      join_token: json.join_token,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
