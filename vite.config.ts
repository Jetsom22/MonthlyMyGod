import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — GitHub Pages 하위 경로(/MonthlyMyGod/)에서도, 로컬에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [react()],
});
