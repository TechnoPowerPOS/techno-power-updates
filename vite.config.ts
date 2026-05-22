
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import renderer from 'vite-plugin-electron-renderer';
import obfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      renderer(),
      isProduction && obfuscator({
        options: {
          // --- إعدادات الحماية القصوى ---
          compact: true,
          controlFlowFlattening: true, // يجعل تتبع الدوال مستحيلاً
          controlFlowFlatteningThreshold: 1, // تطبيق على كامل الكود
          deadCodeInjection: true, // إضافة كود مضلل
          deadCodeInjectionThreshold: 0.4, 
          debugProtection: false, // تعطيلها لتسهيل المعاينة والتطوير
          debugProtectionInterval: 0, 
          disableConsoleOutput: false, // تمكين الكونسول لتسهيل تتبع الأخطاء
          identifierNamesGenerator: 'hexadecimal', // تحويل أسماء المتغيرات لرموز مثل 0x12a
          log: false,
          numbersToExpressions: true, // تحويل الأرقام لمعادلات معقدة
          renameGlobals: true, // تشفير المتغيرات العالمية
          selfDefending: true, // الكود يدمر نفسه إذا تم تعديله
          simplify: true,
          splitStrings: true, // تقطيع النصوص لجزئيات صغيرة
          splitStringsChunkLength: 3,
          stringArray: true, // تشفير النصوص في مصفوفة مخفية
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['rc4', 'base64'], // تشفير ثنائي للنصوص
          stringArrayThreshold: 1,
          transformObjectKeys: true, // تشفير أسماء الخصائص (Objects keys)
          unicodeEscapeSequence: true // تحويل الكود لرموز يونيكود غير مفهومة
        }
      })
    ].filter(Boolean),
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // تمكين الكونسول في النسخة المبنية للتطوير
          drop_debugger: true,
        },
        mangle: true
      },
    }
  };
});
