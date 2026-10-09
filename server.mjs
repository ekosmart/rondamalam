import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative, extname, isAbsolute } from "node:path";
const root = fileURLToPath(new URL("./dist/", import.meta.url));
const port = Number(process.env.PORT) || 4173;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
};
try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error(
    "Build belum tersedia. Jalankan npm run build terlebih dahulu.",
  );
  process.exit(1);
}
http
  .createServer(async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = resolve(root, path === "/" ? "index.html" : "." + path),
        rel = relative(root, file);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const bytes = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Tidak ditemukan.");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Ronda Malam siap dimainkan: http://127.0.0.1:${port}\nTekan Ctrl+C untuk menutup server.`,
    ),
  )
  .on("error", (e) => {
    console.error(
      e.code === "EADDRINUSE"
        ? `Port ${port} sudah dipakai. Buka http://127.0.0.1:${port} atau atur PORT.`
        : e,
    );
    process.exitCode = 1;
  });
