/**
 * Framework-specific cookie option generators.
 * Handles maxAge unit differences: Express uses ms, Next/Hono use seconds.
 */

export type Adapter = 'next' | 'express' | 'hono' | 'standard'

export interface CookieOptions {
	name?: string
	value?: string
	domain?: string
	path?: string
	maxAge?: number
	httpOnly?: boolean
	secure?: boolean
	sameSite?: 'lax' | 'strict' | 'none'
}

const DEFAULTS: CookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	path: '/',
}

function toMaxAge(ttlSeconds: number, adapter: Adapter): number {
	switch (adapter) {
		case 'express':
			return ttlSeconds * 1000
		case 'next':
		case 'hono':
		case 'standard':
		default:
			return ttlSeconds
	}
}

/**
 * Returns cookie options for the given framework.
 * Pass ttlSeconds in overrides to set maxAge (converted per adapter).
 */
export function getCookieOptions(
	adapter: Adapter,
	overrides?: Partial<CookieOptions> & { ttlSeconds?: number }
): CookieOptions {
	const { ttlSeconds, ...rest } = overrides ?? {}
	const opts = { ...DEFAULTS, ...rest }
	if (typeof ttlSeconds === 'number') {
		opts.maxAge = toMaxAge(ttlSeconds, adapter)
	}
	return opts
}

/**
 * Returns cookie options for clearing (maxAge: 0).
 */
export function clearCookieOptions(
	adapter: Adapter,
	overrides?: Partial<Pick<CookieOptions, 'name' | 'domain' | 'path'>>
): CookieOptions {
	return {
		...DEFAULTS,
		...overrides,
		maxAge: 0,
		value: '',
	}
}
