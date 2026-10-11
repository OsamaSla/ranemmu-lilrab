/**
 * One-tap publishing: device -> GitHub -> Pages.
 *
 * On-device edits can never reach git by themselves, so this module ships
 * the override patch set to a `pending-overrides/` inbox on the
 * `overrides-inbox` branch through the GitHub REST API, using a
 * fine-grained personal access token the admin pastes once in Admin
 * (repo-scoped, contents read+write — revokable any time from GitHub).
 * The `apply-inbox` Actions workflow then merges the inbox into the
 * workbooks, rebuilds the corpus, commits to `main`, and Pages redeploys.
 * A few minutes after tapping Publish the fix is live for everyone.
 *
 * Local overrides are intentionally NOT cleared on success: the phone app
 * only picks up the rebuilt corpus with its next build, so the local patch
 * keeps showing the fix until then (same values, no conflict).
 */
import type { TranslationKey } from '../i18n';
import type { Hymn } from './types';

const OWNER = 'OsamaSla';
const REPO = 'ranemmu-lilrab';
const INBOX_BRANCH = 'overrides-inbox';
const INBOX_DIR = 'pending-overrides';
const API = 'https://api.github.com';

export interface PublishResult {
  ok: boolean;
  messageKey: TranslationKey;
}

/** Base64 of UTF-8, hand-rolled: Buffer is unavailable in the RN runtime
 * and btoa/TextEncoder availability varies, so this depends on nothing. */
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8ToBase64(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64_CHARS[(triple >> 18) & 0x3f] + B64_CHARS[(triple >> 12) & 0x3f];
    out += i + 1 < bytes.length ? B64_CHARS[(triple >> 6) & 0x3f] : '=';
    out += i + 2 < bytes.length ? B64_CHARS[triple & 0x3f] : '=';
  }
  return out;
}

type ApiError = Error & { code: 'auth' | 'http' };

async function api(token: string, path: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw Object.assign(new Error('network'), { code: 'http' } satisfies { code: ApiError['code'] });
  }
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error('auth'), { code: 'auth' } satisfies { code: ApiError['code'] });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`http-${res.status}`), { code: 'http' } satisfies {
      code: ApiError['code'];
    });
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Creates the inbox branch from main on first publish; later runs reuse it. */
async function ensureInboxBranch(token: string): Promise<void> {
  const existing = await api(token, `/repos/${OWNER}/${REPO}/git/ref/heads/${INBOX_BRANCH}`).catch(
    () => null,
  );
  if (existing) return;
  const main = (await api(token, `/repos/${OWNER}/${REPO}/git/ref/heads/main`)) as {
    object: { sha: string };
  };
  // A concurrent first-publish may win the race (422): the file PUT below
  // proves the branch either way, so that failure is swallowed.
  await api(token, `/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${INBOX_BRANCH}`, sha: main.object.sha }),
  }).catch(() => null);
}

export async function publishOverrides(
  token: string,
  overrides: Record<string, Partial<Hymn>>,
): Promise<PublishResult> {
  if (!token.trim()) return { ok: false, messageKey: 'admin.noToken' };
  if (Object.keys(overrides).length === 0) return { ok: false, messageKey: 'admin.noChanges' };
  try {
    await api(token, '/user'); // validates the token before touching the repo
    await ensureInboxBranch(token);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `overrides-${stamp}-${Math.floor(Math.random() * 1e6)}.json`;
    const payload = JSON.stringify(
      {
        app: 'ranemmu.lilrab',
        version: 1,
        exportedAt: new Date().toISOString(),
        overrides,
      },
      null,
      1,
    );
    await api(token, `/repos/${OWNER}/${REPO}/contents/${INBOX_DIR}/${name}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Inbox overrides ${stamp}`,
        content: utf8ToBase64(payload),
        branch: INBOX_BRANCH,
      }),
    });
    return { ok: true, messageKey: 'admin.published' };
  } catch (e) {
    if ((e as ApiError).code === 'auth') return { ok: false, messageKey: 'admin.noToken' };
    return { ok: false, messageKey: 'admin.publishFailed' };
  }
}
