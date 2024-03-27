import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import Path from 'path';

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: Path.resolve('index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: ['magic-string', 'estree-walker'],
        },
    },
    plugins: [dts({ rollupTypes: true })],
});
