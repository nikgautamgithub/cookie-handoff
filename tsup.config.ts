import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['cjs', 'esm'],
	minify: true,
	dts: true,
	clean: true,
	outDir: 'dist',
	splitting: false,
	sourcemap: false,
	target: 'es2021',
})
