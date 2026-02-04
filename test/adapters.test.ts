import { describe, expect, test } from 'bun:test'
import { clearCookieOptions, getCookieOptions } from '../src/adapters'

describe('getCookieOptions', () => {
	test('returns defaults with httpOnly, secure, sameSite, path', () => {
		const opts = getCookieOptions('next')
		expect(opts.httpOnly).toBe(true)
		expect(opts.secure).toBe(true)
		expect(opts.sameSite).toBe('lax')
		expect(opts.path).toBe('/')
	})

	test('express maxAge is in milliseconds', () => {
		const opts = getCookieOptions('express', { ttlSeconds: 60 })
		expect(opts.maxAge).toBe(60_000)
	})

	test('next/hono/standard maxAge is in seconds', () => {
		expect(getCookieOptions('next', { ttlSeconds: 60 }).maxAge).toBe(60)
		expect(getCookieOptions('hono', { ttlSeconds: 120 }).maxAge).toBe(120)
		expect(getCookieOptions('standard', { ttlSeconds: 300 }).maxAge).toBe(300)
	})

	test('overrides merge correctly', () => {
		const opts = getCookieOptions('next', {
			ttlSeconds: 90,
			name: 'session',
			path: '/api',
		})
		expect(opts.name).toBe('session')
		expect(opts.path).toBe('/api')
		expect(opts.maxAge).toBe(90)
	})
})

describe('clearCookieOptions', () => {
	test('returns maxAge 0 and value empty', () => {
		const opts = clearCookieOptions('next')
		expect(opts.maxAge).toBe(0)
		expect(opts.value).toBe('')
	})

	test('overrides name, domain, path', () => {
		const opts = clearCookieOptions('next', {
			name: 'sid',
			domain: '.example.com',
			path: '/',
		})
		expect(opts.name).toBe('sid')
		expect(opts.domain).toBe('.example.com')
		expect(opts.path).toBe('/')
	})
})
