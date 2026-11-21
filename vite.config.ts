import { defineConfig } from 'vite';

// base 用相对路径，方便放到 GitHub Pages 子路径或任何静态目录
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2018' },
  test: { include: ['tests/**/*.test.ts'] },
} as any);
