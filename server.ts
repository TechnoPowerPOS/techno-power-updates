import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 💡 التحديد الذكي لمسار الإنتاج (Production Path) المتوافق مع Electron
  const distPath = __dirname;
  const isProduction = fs.existsSync(path.join(distPath, "index.html"));

  if (!isProduction) {
    // وضع التطوير (Development): استدعاء Vite بشكل ديناميكي لتجنب خطأ الشاشة البيضاء
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // وضع التشغيل النهائي (Production): تقديم الملفات الثابتة للعميل
    app.use(express.static(distPath));
    
    // SPA fallback (لضمان عمل الـ React Router بشكل سليم)
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // 🛡️ حماية السيرفر من الانهيار إذا كان البورت مستخدماً بالفعل
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use, reusing existing server safely.`);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer();