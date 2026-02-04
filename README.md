# cookie-handoff

AES-256-GCM encrypted cross-subdomain cookie handoff. Privacy by default, Web Crypto native, replay-resistant.

## Why Use This?

Most cookie tutorials teach you to **sign** data (JWT-style), leaving user data visible in the cookie. **cookie-handoff** uses AES-256-GCM **encryption** by default. It's smaller than jsonwebtoken, safer than a plain signature, and runs on every Edge runtime without polyfills.

| Feature  | cookie-handoff           | jsonwebtoken        | iron-session         |
| -------- | ------------------------ | ------------------- | -------------------- |
| Security | Encryption (AES-GCM)     | Signature (visible) | Encryption (AES-GCM) |
| Privacy  | High (opaque)            | Low (readable)      | High (opaque)        |
| Runtime  | Web Crypto (edge native) | Node Crypto         | Node / Web Crypto    |
| Size     | ~1.5KB                   | ~8KB                | ~10KB                |
| Focus    | Short-term handoff       | Identity tokens     | Long-term sessions   |

## Install

```bash
bun add cookie-handoff
# or
npm install cookie-handoff
```

## Quick start

```typescript
import { seal, unseal, getCookieOptions } from 'cookie-handoff'

// Sender: seal payload and set cookie
const value = await seal({ userId: '123' }, process.env.SECRET!, 300)
response.cookies.set(
	'ctx',
	value,
	getCookieOptions('next', {
		name: 'ctx',
		domain: '.example.com',
		ttlSeconds: 300,
	})
)

// Receiver: read and unseal
const payload = await unseal<{ userId: string }>(cookieStore.get('ctx')?.value, process.env.SECRET!)
```

## Why the adapter (`'next'` | `'express'` | `'hono'`)?

Different frameworks expect `maxAge` in **different units**. Next.js and Hono use **seconds**; Express uses **milliseconds**. Passing the wrong unit breaks cookie expiration.

`getCookieOptions(adapter, overrides)` converts `ttlSeconds` to the correct `maxAge` for your framework so you don't have to think about it:

| Adapter      | maxAge unit  | Example: 300s TTL       |
| ------------ | ------------ | ----------------------- |
| `'next'`     | seconds      | `maxAge: 300`           |
| `'hono'`     | seconds      | `maxAge: 300`           |
| `'express'`  | milliseconds | `maxAge: 300000`        |
| `'standard'` | seconds      | `maxAge: 300` (generic) |

**If you prefer inline options**, you can skip `getCookieOptions` and pass your own:

```typescript
// Next.js: maxAge in seconds
response.cookies.set('ctx', value, {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	maxAge: 300,
	path: '/',
	domain: '.example.com',
})
```

## Usage by framework

### Next.js (App Router)

```typescript
// app/api/redirect/route.ts
import { seal, getCookieOptions } from 'cookie-handoff';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const payload = { userId: '123', redirectTo: '/dashboard' };
  const value = await seal(payload, process.env.COOKIE_SECRET!, 300);

  const opts = getCookieOptions('next', {
    name: 'ctx',
    domain: '.example.com',
    ttlSeconds: 300,
  });
  const res = NextResponse.redirect('https://app.example.com');
  res.cookies.set(opts.name!, value, opts);
  return res;
}

// app/page.tsx (Server Component)
import { unseal } from 'cookie-handoff';
import { cookies } from 'next/headers';

export default async function Page() {
  const payload = await unseal<{ userId: string }>(
    (await cookies()).get('ctx')?.value,
    process.env.COOKIE_SECRET!
  );
  if (!payload) return <div>Invalid or expired</div>;
  return <div>Welcome {payload.userId}</div>;
}
```

### Express

```typescript
import { seal, getCookieOptions } from 'cookie-handoff'

app.get('/redirect', async (req, res) => {
	const value = await seal({ userId: req.user!.id }, process.env.SECRET!, 300)
	const opts = getCookieOptions('express', {
		name: 'ctx',
		domain: '.example.com',
		ttlSeconds: 300,
	})
	res.cookie(opts.name!, value, opts)
	res.redirect('https://app.example.com')
})
```

### Hono

```typescript
import { seal, getCookieOptions } from 'cookie-handoff'

app.get('/redirect', async (c) => {
	const value = await seal({ userId: '123' }, process.env.SECRET!, 300)
	const opts = getCookieOptions('hono', {
		name: 'ctx',
		domain: '.example.com',
		ttlSeconds: 300,
	})
	setCookie(c, opts.name!, value, opts)
	return c.redirect('https://app.example.com')
})
```

### Clear cookie (optional)

```typescript
import { clearCookieOptions } from 'cookie-handoff'

// Next.js
const opts = clearCookieOptions('next', { name: 'ctx', domain: '.example.com' })
response.cookies.set(opts.name!, '', opts)

// Or inline: maxAge: 0 clears the cookie
response.cookies.set('ctx', '', { maxAge: 0, path: '/', domain: '.example.com' })
```

## API

- **`seal<T>(payload, secret, ttlSeconds?)`** – Encrypts payload, embeds expiration. Returns `"iv_base64url.ciphertext_base64url"`. Default TTL: 300s.
- **`unseal<T>(token, secret)`** – Decrypts, validates integrity, checks expiration. Returns `T | null`.
- **`getCookieOptions(adapter, overrides?)`** – Framework-specific cookie options. Use the adapter that matches your framework.
- **`clearCookieOptions(adapter, overrides?)`** – Options for clearing the cookie.

## Secret key

Use a strong, random secret (e.g. 32 bytes hex):

```bash
openssl rand -hex 32
```

Store it in an env var and never commit it.

## PII protection

The payload is **encrypted**, not signed. Client-side inspection of the cookie reveals nothing. Tampering or expiration causes `unseal` to return `null`. The `_exp` timestamp is embedded in the ciphertext, so captured cookies cannot be replayed after the TTL window.

## Supported runtimes

- Node 18+
- Bun
- Deno
- Cloudflare Workers
- Vercel Edge

## License

MIT
