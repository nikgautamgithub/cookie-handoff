import { describe, expect, test } from 'bun:test'
import { seal, unseal } from '../src/crypto'

const SECRET = 'test-secret-at-least-32-chars'

describe('seal / unseal', () => {
	test('round-trip returns same payload', async () => {
		const payload = { id: 'user-1', role: 'admin' }
		const token = await seal(payload, SECRET, 60)
		expect(token).toContain('.')
		const out = await unseal<typeof payload>(token, SECRET)
		expect(out).toEqual(payload)
	})

	test('wrong secret returns null', async () => {
		const token = await seal({ x: 1 }, SECRET, 60)
		const out = await unseal(token, 'wrong-secret')
		expect(out).toBeNull()
	})

	test('expired token returns null', async () => {
		const token = await seal({ x: 1 }, SECRET, -1)
		const out = await unseal(token, SECRET)
		expect(out).toBeNull()
	})

	test('invalid token (bad format) returns null', async () => {
		expect(await unseal('not-dot-separated', SECRET)).toBeNull()
		expect(await unseal('a.b.c', SECRET)).toBeNull()
		expect(await unseal('', SECRET)).toBeNull()
		expect(await unseal(undefined as unknown as string, SECRET)).toBeNull()
	})

	test('empty secret returns null', async () => {
		const token = await seal({ x: 1 }, SECRET, 60)
		expect(await unseal(token, '')).toBeNull()
	})
})
