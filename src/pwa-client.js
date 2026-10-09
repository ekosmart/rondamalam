import { SAVE_KEY } from "./data.js";
import { parseSaveBackup, saveBackup } from "./save-transfer.js";
export class PWAClient {
  constructor(game) {
    this.game = game;
    this.installPrompt = null;
    this.registration = null;
    this.status = import.meta.env.PROD
      ? "Menyiapkan akses offline…"
      : "Mode pengembangan";
    this.reloading = false;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.refresh();
    });
    window.addEventListener("appinstalled", () => {
      this.installPrompt = null;
      this.refresh();
      game.ui.toast("Ronda Malam sudah terpasang.", "success");
    });
    if (import.meta.env.PROD && "serviceWorker" in navigator) this.register();
    this.input = document.createElement("input");
    this.input.type = "file";
    this.input.accept = ".json,application/json";
    this.input.hidden = true;
    this.input.setAttribute("aria-label", "Impor save Ronda Malam");
    document.body.append(this.input);
    this.input.addEventListener("change", async () => {
      const file = this.input.files[0];
      if (!file) return;
      try {
        if (file.size > 1_000_000) throw Error("File terlalu besar.");
        const d = parseSaveBackup(await file.text());
        // Import is explicitly chosen in settings. Keep the old save downloadable before replacement.
        this.download(game.state.data, "sebelum-impor");
        localStorage.setItem(SAVE_KEY, JSON.stringify(d));
        game.state.data = d;
        location.reload();
      } catch (e) {
        game.ui.toast("Impor gagal: " + e.message, "error");
        this.input.value = "";
      }
    });
  }
  async register() {
    try {
      const r = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      this.registration = r;
      const ready = () => {
        this.status = r.waiting
          ? "Pembaruan siap dipasang"
          : "Siap dimainkan offline";
        this.refresh();
      };
      navigator.serviceWorker.ready.then(ready);
      const watch = (worker) =>
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            ready();
            if (r.waiting)
              this.game.ui.toast(
                "Pembaruan tersedia. Simpan lalu pasang lewat Pengaturan.",
              );
          }
        });
      watch(r.installing);
      r.addEventListener("updatefound", () => watch(r.installing));
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (this.reloading) location.reload();
      });
      window.addEventListener("online", () => r.update().catch(() => {}));
    } catch {
      this.status = "Offline belum tersedia; coba saat tersambung.";
      this.refresh();
    }
  }
  refresh() {
    if (this.game.ui.panel === "settings") this.game.ui.open("settings");
  }
  settingsHTML() {
    return `<div><span><strong>Pasang game</strong><small>${this.status}. Instal lewat menu browser bila tombol belum tersedia.</small></span><button class="pill-button" data-action="pwa-install">${matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches ? "Sudah terpasang" : "Instal aplikasi"}</button></div><div><span><strong>Pembaruan game</strong><small>Progres disimpan sebelum versi baru dibuka.</small></span><button class="pill-button" data-action="pwa-update">${this.registration?.waiting ? "Simpan & perbarui" : "Periksa versi"}</button></div><div><span><strong>Layar penuh</strong><small>Di ponsel, gunakan posisi mendatar untuk bermain.</small></span><button class="pill-button" data-action="pwa-fullscreen">Layar penuh</button></div><div><span><strong>Pindahkan progres</strong><small>Ekspor dari localhost, lalu impor di alamat Vercel / aplikasi. Impor mengganti progres; salinan sebelumnya ikut diunduh.</small></span><span class="save-actions"><button class="pill-button" data-action="pwa-export">Ekspor save</button><button class="pill-button" data-action="pwa-import">Impor save</button></span></div><div><span><strong>Privasi</strong><small>Progres lokal, tanpa akun dan tanpa analitik.</small></span><a class="pill-button" href="/privacy.html" target="_blank" rel="noopener">Baca kebijakan</a></div>`;
  }
  download(d, suffix = "perjalanan") {
    const blob = new Blob([saveBackup(d)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `ronda-malam-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  action(action) {
    if (!action.startsWith("pwa-")) return false;
    if (action === "pwa-export") {
      this.game.state.save();
      this.download(this.game.state.data);
      this.game.ui.toast(
        "Save diekspor. Simpan file untuk dipindahkan ke perangkat atau alamat baru.",
      );
    }
    if (action === "pwa-import") {
      this.input.value = "";
      this.input.click();
    }
    if (action === "pwa-install") {
      if (this.installPrompt) {
        this.installPrompt.prompt();
        this.installPrompt.userChoice.then(() => {
          this.installPrompt = null;
          this.refresh();
        });
      } else
        this.game.ui.toast(
          "Gunakan menu browser → Instal aplikasi / Tambahkan ke layar utama. Di iPhone: Bagikan → Tambahkan ke Layar Utama.",
        );
    }
    if (action === "pwa-fullscreen") {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else
        document.documentElement
          .requestFullscreen?.()
          .then(() => screen.orientation?.lock?.("landscape"))
          .catch(() =>
            this.game.ui.toast("Putar perangkat ke posisi mendatar."),
          );
    }
    if (action === "pwa-update") this.update();
    return true;
  }
  async update() {
    const r = this.registration;
    if (!r) {
      this.game.ui.toast("Pembaruan offline tersedia pada build produksi.");
      return;
    }
    if (r.waiting) {
      if (!this.game.state.save()) {
        this.game.ui.toast(
          "Save gagal. Ekspor progres sebelum memperbarui.",
          "error",
        );
        return;
      }
      this.reloading = true;
      r.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      try {
        await r.update();
        this.game.ui.toast(
          r.installing
            ? "Versi baru sedang diunduh. Buka kembali pengaturan setelah siap."
            : "Pemeriksaan selesai. Tidak ada pembaruan siap dipasang.",
        );
      } catch {
        this.game.ui.toast(
          "Belum tersambung. Versi offline tetap dapat dimainkan.",
        );
      }
    }
  }
}
