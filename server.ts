import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 💡 التعديل السحري: السيرفر بيعرف إنه جوه الـ exe لو لقى ملف index.html جنبه
  const distPath = __dirname;
  const isProduction = fs.existsSync(path.join(distPath, "index.html"));

  if (!isProduction) {
    // وضع التطوير (Development)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // وضع التشغيل النهائي (Production)
    app.use(express.static(distPath));
    
    // SPA fallback
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use, reusing existing server safely.`);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer();