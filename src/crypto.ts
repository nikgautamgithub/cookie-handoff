/**
 * AES-256-GCM seal/unseal using Web Crypto API.
 * Edge-native: Cloudflare Workers, Vercel Edge, Deno, Bun, Node 18+.
 */

const SEPARATOR = '.'
const IV_LENGTH = 12
const TTL_DEFAULT = 300

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCodePoint(byte)
	}
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
	const padded = str.replaceAll('-', '+').replaceAll('_', '/')
	const binary = atob(padded)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.codePointAt(i) ?? 0
	}
	return bytes
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
	if (view.byteOffset === 0 && view.buffer.byteLength === view.byteLength) {
		return view.buffer as ArrayBuffer
	}
	return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

async function deriveKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder()
	const data = encoder.encode(secret)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
		'encrypt',
		'decrypt',
	])
}

/**
 * Encrypts payload with AES-256-GCM, embeds expiration.
 * Returns: "iv_base64url.ciphertext_base64url"
 */
export async function seal<T extends Record<string, unknown>>(
	payload: T,
	secret: string,
	ttlSeconds: number = TTL_DEFAULT
): Promise<string> {
	const key = await deriveKey(secret)
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
	const exp = Date.now() + ttlSeconds * 1000
	const data = { ...payload, _exp: exp }
	const plaintext = new TextEncoder().encode(JSON.stringify(data))
	const plaintextBuf = toArrayBuffer(plaintext)

	// TS lib BufferSource types are overly strict; Uint8Array/ArrayBuffer work at runtime
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: iv as unknown as ArrayBuffer,
			tagLength: 128,
		},
		key,
		plaintextBuf as unknown as ArrayBuffer
	)

	const ivB64 = base64UrlEncode(iv as Uint8Array)
	const ctB64 = base64UrlEncode(ciphertext)
	return `${ivB64}${SEPARATOR}${ctB64}`
}

/**
 * Decrypts, validates integrity, checks expiration.
 * Returns payload (without _exp) or null if invalid/expired.
 */
export async function unseal<T>(token: string | undefined, secret: string): Promise<T | null> {
	if (!token || !secret) return null

	const parts = token.split(SEPARATOR)
	if (parts.length !== 2) return null

	const [ivB64, ctB64] = parts
	let iv: Uint8Array
	let ciphertext: Uint8Array

	try {
		iv = base64UrlDecode(ivB64)
		ciphertext = base64UrlDecode(ctB64)
	} catch {
		return null
	}

	const key = await deriveKey(secret)

	let plaintext: ArrayBuffer
	try {
		const ctBuf = toArrayBuffer(ciphertext)
		plaintext = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: iv as unknown as ArrayBuffer,
				tagLength: 128,
			},
			key,
			ctBuf as unknown as ArrayBuffer
		)
	} catch {
		return null
	}

	const json = new TextDecoder().decode(plaintext)
	let data: Record<string, unknown>

	try {
		data = JSON.parse(json) as Record<string, unknown>
	} catch {
		return null
	}

	const exp = data._exp as number | undefined
	if (typeof exp !== 'number' || exp < Date.now()) {
		return null
	}

	delete data._exp
	return data as T
}
