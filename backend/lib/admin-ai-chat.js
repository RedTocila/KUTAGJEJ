'use strict';

const { runAdminAiTool, MUTATING_TOOLS, redactArgs } = require('./admin-ai-ops');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_ADMIN_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY = 16;
const MAX_CONTENT = 4000;

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

const USER_REF = {
  type: 'object',
  properties: {
    email: { type: 'string', description: 'User email (preferred)' },
    userId: { type: 'string', description: 'User UUID' },
  },
};

function withUserRef(extra) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...USER_REF.properties,
      ...extra,
    },
  };
}

const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'lookup_user',
      description: 'Find users by email, UUID, name, business name, or NIPT. Use before any mutation.',
      parameters: withUserRef({
        query: { type: 'string', description: 'Free-text name / NIPT / partial email' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_overview',
      description: 'Full account snapshot: BC, slots, plan, listing counts, recent payments.',
      parameters: withUserRef({}),
    },
  },
  {
    type: 'function',
    function: {
      name: 'adjust_boost_credits',
      description: 'Add, subtract, or set Boost Coins (BC) on a portal/staff user. First call without confirm to preview.',
      parameters: withUserRef({
        delta: { type: 'number', description: 'Signed amount, e.g. 200 or -50' },
        setTo: { type: 'number', description: 'Absolute balance to set' },
        reason: { type: 'string' },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_auto_refresh_slots',
      description: 'Add/set Auto-Refresh slots on a user.',
      parameters: withUserRef({
        delta: { type: 'number' },
        setTo: { type: 'number' },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_user_password',
      description: 'Set a new password for a portal or staff user via Supabase Auth admin API.',
      parameters: withUserRef({
        password: { type: 'string', minLength: 6 },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_user_active',
      description: 'Activate or deactivate a user (is_active). Prefer this over delete.',
      parameters: withUserRef({
        isActive: { type: 'boolean' },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_user',
      description: 'Permanently delete Auth user + profile. Requires confirmEmail matching the account.',
      parameters: withUserRef({
        confirmEmail: { type: 'string' },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pending_listings',
      description: 'List listings waiting for moderation.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['real-estate', 'cars', 'jobs', 'marketplace', 'businesses', 'professionals'],
          },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'review_listing',
      description: 'Approve or reject a listing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['real-estate', 'cars', 'jobs', 'marketplace', 'businesses', 'professionals'],
          },
          listingId: { type: 'string' },
          decision: { type: 'string', enum: ['approve', 'reject'] },
          adminNote: { type: 'string' },
          confirm: { type: 'boolean' },
        },
        required: ['kind', 'listingId', 'decision'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_stats',
      description: 'Platform totals: users by type, listings by kind/status.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_user_payments',
      description: 'Recent payments for a user.',
      parameters: withUserRef({}),
    },
  },
  {
    type: 'function',
    function: {
      name: 'grant_subscription',
      description: 'Grant FREE/STARTER/GROW/ELITE to a user. Cancels their current active plan.',
      parameters: withUserRef({
        planCode: { type: 'string', enum: ['free', 'starter', 'grow', 'elite'] },
        months: { type: 'number' },
        grantBoostCredits: { type: 'boolean', description: 'Also add the plan BC (default true)' },
        confirm: { type: 'boolean' },
      }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_subscription',
      description: 'Cancel the user active subscription. Does not remove already granted BC.',
      parameters: withUserRef({ confirm: { type: 'boolean' } }),
    },
  },
  {
    type: 'function',
    function: {
      name: 'diagnose_schema',
      description:
        'Read-only probe of key Supabase tables/columns. Never runs SQL, DROP, TRUNCATE, or repairs.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_recent_ai_actions',
      description: 'Recent admin AI audit log entries.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { limit: { type: 'number' } },
      },
    },
  },
];

function systemPrompt() {
  return `Je asistent administratori për marketplace-in KuTaGjej (Shqipëri).
Përgjigju shkurt në shqip, përveç nëse admini shkruan anglisht.

Rregulla:
- Për çdo ndryshim, gjej fillimisht përdoruesin me lookup_user / get_user_overview (email është identifikuesi kryesor).
- Veprimet mutuese (BC, fjalëkalim, fshirje, paketë, moderim) thirren SË PARI pa confirm. Nëse mjeti kthen needsConfirmation, trego përmbledhjen dhe thuaj që admini duhet të konfirmojë nga butoni ose duke shkruar "po". MOS e vë confirm=true vetë në të njëjtin hap.
- MOS prek llogari admin. MOS ekzekuto SQL. MOS sugjero init.sql, DROP, TRUNCATE, ose supabase db reset.
- Për probleme skeme: përdor diagnose_schema (vetëm lexim). Nëse mungon diçka, këshillo migrimin additive ose repair-missing-schema.sql.
- Mos përsërit fjalëkalime në përgjigje.
- Nëse kërkesa është e paqartë, pyet për emailin.

Mjete: lookup_user, get_user_overview, adjust_boost_credits, set_auto_refresh_slots, set_user_password, set_user_active, delete_user, list_pending_listings, review_listing, get_platform_stats, list_user_payments, grant_subscription, cancel_subscription, diagnose_schema, list_recent_ai_actions.`;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    if (!role) continue;
    const content = String(item.content || '').trim().slice(0, MAX_CONTENT);
    if (!content) continue;
    out.push({ role, content });
  }
  return out;
}

function parseToolArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function openaiChat(messages, { tools = true } = {}) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  const body = {
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages,
  };
  if (tools) body.tools = OPENAI_TOOLS;

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  return payload?.choices?.[0]?.message || { role: 'assistant', content: '' };
}

function summarizeTool(name, args, result) {
  if (result?.needsConfirmation) {
    return { name, status: 'needs_confirmation', summary: result.summary || name };
  }
  if (result?.ok === false) {
    return { name, status: 'error', summary: result.message || 'Dështoi' };
  }
  if (name === 'adjust_boost_credits') {
    return { name, status: 'ok', summary: `${args.email || ''} ${result.before} → ${result.after} BC` };
  }
  if (name === 'set_user_password') {
    return { name, status: 'ok', summary: `Fjalëkalimi u ndryshua për ${result.email}` };
  }
  if (name === 'delete_user') {
    return { name, status: 'ok', summary: `U fshi ${result.email}` };
  }
  return { name, status: 'ok', summary: result?.email || result?.message || name };
}

async function runToolLoop(history, admin) {
  const messages = [{ role: 'system', content: systemPrompt() }, ...history];
  const toolsUsed = [];
  let pendingAction = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const message = await openaiChat(messages, { tools: true });
    messages.push(message);

    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (!calls.length) {
      return {
        reply: String(message.content || '').trim() || 'Gati.',
        toolsUsed,
        pendingAction,
      };
    }

    for (const call of calls) {
      const name = call?.function?.name || '';
      const args = parseToolArgs(call?.function?.arguments);
      let result;
      try {
        result = await runAdminAiTool(name, args, { admin });
      } catch (err) {
        result = { ok: false, message: err?.message || 'Gabim gjatë ekzekutimit.' };
      }
      toolsUsed.push(summarizeTool(name, args, result));
      if (result?.needsConfirmation && !pendingAction) {
        pendingAction = {
          name,
          args: result.args && typeof result.args === 'object' ? result.args : args,
          summary: result.summary || name,
        };
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: 'Arrita limitin e hapave. Konfirmo ose jep një kërkesë më të thjeshtë.',
    toolsUsed,
    pendingAction,
  };
}

async function runAdminAiChat({ messages, admin }) {
  const history = sanitizeHistory(messages);
  if (!history.length) {
    return { reply: 'Si mund t’ju ndihmoj? P.sh. shto BC, ndrysho fjalëkalim, ose diagnostiko skemën.', toolsUsed: [] };
  }
  const last = history[history.length - 1];
  if (last.role !== 'user') {
    return { reply: 'Dërgoni një mesazh të ri.', toolsUsed: [] };
  }
  return runToolLoop(history, admin);
}

async function confirmAdminAiAction({ action, messages, admin }) {
  const name = String(action?.name || '').trim();
  if (!MUTATING_TOOLS.has(name)) {
    return { ok: false, message: 'Ky veprim nuk mund të konfirmohet.' };
  }
  const args = action?.args && typeof action.args === 'object' ? action.args : {};
  let result;
  try {
    result = await runAdminAiTool(name, args, { admin, skipConfirm: true });
  } catch (err) {
    result = { ok: false, message: err?.message || 'Gabim gjatë ekzekutimit.' };
  }

  const history = sanitizeHistory(messages);
  const summaryUser = {
    role: 'user',
    content: `Veprimi "${name}" u ${result.ok === false ? 'refuzua' : 'ekzekutua'}. Përmbledh për adminin në shqip, pa fjalëkalime. Rezultati: ${JSON.stringify(redactArgs(name, result))}`,
  };
  let reply = result.ok === false ? result.message || 'Dështoi.' : result.message || 'U krye.';
  try {
    const message = await openaiChat([{ role: 'system', content: systemPrompt() }, ...history, summaryUser], {
      tools: false,
    });
    if (message?.content) reply = String(message.content).trim();
  } catch {
    /* keep fallback reply */
  }

  return {
    reply,
    toolsUsed: [summarizeTool(name, args, result)],
    result,
    pendingAction: null,
  };
}

module.exports = {
  isOpenAiConfigured,
  runAdminAiChat,
  confirmAdminAiAction,
  OPENAI_TOOLS,
};
