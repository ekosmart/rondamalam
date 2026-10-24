import { STATION, LARAS } from "./magic/rules.js";
import { GHOST_VOICES } from "./ghost-audio.js";
import { TouchJoystick } from "./touch-joystick.js";
import { SHOP_ITEMS, DINOSAURS } from "./frontier-data.js";
import {
  ZONES,
  POSTS,
  GHOSTS,
  WEAPONS,
  MOUNTS,
  QUESTS,
  ELEMENTS,
  RESOURCE_NAMES,
} from "./data.js";
import { clamp, distance } from "./state.js";
import { RACE_TRACK } from "./layout.js";

const paths = {
  moon: "M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
  heart: "M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 8 15 8 15S25 10 20 5Z",
  bolt: "m13 2-8 12h7l-1 8 8-12h-7l1-8Z",
  bag: "M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2",
  book: "M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-3-1-6-1-9 2-3-3-6-3-9-2V4Z",
  map: "m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2V5Zm6-2v16m6-13v16",
  pin: "M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Zm-4 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  bat: "m14 3 7 7-10 9-6-6 9-10Zm-7 12-4 5 1 1 5-4",
  sword: "m20 3-2 8-8 7-4-4 7-8 7-3ZM4 12l8 8m-5-3-4 4",
  light: "m7 3 10 0-2 6H9L7 3Zm2 6v12h6V9M4 1 2 4m18-3 2 3",
  bottle:
    "M9 2h6v4l3 5v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9l3-5V2Zm-3 12h12M9 6h6",
  ghost: "M5 21V10a7 7 0 1 1 14 0v11l-4-3-3 3-3-3-4 3Zm4-11v2m6-2v2",
  bike: "M9 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm14 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 16l4-9 5 9H5Zm9 0 4-12h-3M7 7h5",
  home: "m2 10 10-8 10 8M5 8v13h14V8M9 21v-8h6v8",
  leaf: "M20 3c-10-1-18 4-15 13s17 1 15-13ZM4 21 16 8",
  fire: "M13 2c2 7 8 8 7 13-1 8-16 9-16-1 0-3 3-7 5-8 0 5 1 6 2 6s3-4 2-10Z",
  wind: "M2 8h14a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 17h7a2 2 0 1 1-2 2",
  water: "M12 2C9 7 4 12 5 16c2 8 15 7 14-1-1-4-4-9-7-13Z",
  coin: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v12m3-10h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  up: "M12 20V4m-6 6 6-6 6 6",
  down: "M12 4v16m-6-6 6 6 6-6",
  close: "m6 6 12 12M6 18 18 6",
  sound: "M11 3 5 8H2v8h3l6 5V3Zm4 4a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  check: "m4 12 5 5L20 6",
  hammer: "m4 21 9-10m-3-5 4-4 8 8-4 4-8-8Z",
  pause: "M8 5v14M16 5v14",
  star: "m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z",
};
export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.ghost}"/></svg>`;
}
const costText = (c) =>
  Object.entries(c || {})
    .map(([k, v]) => `${v} ${RESOURCE_NAMES[k]}`)
    .join(" · ");
const button = (action, label, cls = "", extra = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const tabs = [
  ["camp", "home", "Pos ronda"],
  ["inventory", "bag", "Bekal"],
  ["bestiary", "ghost", "Almanak roh"],
  ["journal", "book", "Jurnal"],
  ["map", "map", "Peta desa"],
];

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.querySelector("#ui");
    this.panel = null;
    this.lastZone = "";
    this.toastTimer = 0;
    this.tipTimer = 16;
    this.currentTab = "forge";
    this.menuOpen = true;
    this.selectedGhost = null;
    this.root.innerHTML = `
      <div id="menu" class="title-screen">
        <header class="menu-header"><div class="brand-mark">${icon("moon", 27)}<span>SEBUAH KISAH DARI NUSANTARA</span></div><span class="edition"><i></i> RPG DUNIA TERBUKA <b>01 / SUKARAME</b></span></header>
        <main class="title-content"><div class="eyebrow"><span></span> SAAT KAMPUNG TERLELAP</div><h1>RONDA<br/><em>MALAM</em><span class="title-stroke"></span></h1><div class="title-sub"><span>SHIFT KLIWON</span><i>ꦱꦸꦏꦫꦩꦺ</i></div><p class="intro-copy">Lima denting memecah sunyi.<br/>Satu kampung menggantungkan pagi padamu.</p><div class="title-actions">${button("start", `<span>${this.game.state.data.introSeen ? "Lanjutkan perjalanan" : "Mulai ronda"}</span>${icon("arrow", 22)}`, "primary start-btn")}${button("help", `${icon("book", 17)} Panduan bermain`, "text-button")}</div><div class="title-note">${icon("sound", 15)} Gunakan headphone. Dengarkan yang tak terlihat.</div></main>
        <div class="scene-caption"><span class="caption-rule"></span><div><span>KAMPUNG SUKARAME</span><strong>Malam Jumat Kliwon</strong><small>19:12 WIB · Ada yang belum pulang.</small></div></div>
        <footer class="menu-footer"><span>JAGA YANG HIDUP. TENANGKAN YANG MATI.</span><span>THREE.JS <i>✧</i> EKSPLORASI 3D</span></footer>
      </div>
      <div id="hud" class="hidden">
        <header class="hud-top"><div class="game-brand"><span class="mini-sigil">${icon("moon", 24)}</span><div>RONDA MALAM<small>SHIFT KLIWON</small></div></div><div class="compass"><span id="compass-west">B</span><span>·</span><span>·</span><strong id="compass-center">U</strong><span>·</span><span>·</span><span id="compass-east">T</span><i></i><small id="zone-top">KAMPUNG SUKARAME</small></div><div class="top-actions">${button("journal", icon("book"), "icon-button", 'title="Jurnal [J]" aria-label="Buka jurnal"')}${button("inventory", icon("bag"), "icon-button", 'title="Bekal [I]" aria-label="Buka bekal"')}${button("settings", icon("settings"), "icon-button", 'title="Pengaturan [Esc]" aria-label="Pengaturan"')}</div></header>
        <section class="player-card"><div class="avatar">${icon("shield", 24)}<b id="level">1</b></div><div class="player-vitals"><div class="name-row"><strong>PAK HANSIP</strong><span id="health-text">100 / 100</span></div><div class="meter hp"><i id="hp-fill"></i></div><div class="meter stamina"><i id="stamina-fill"></i></div><div class="vitals-bottom"><span id="status-label"><i></i> Dalam lindungan</span><span>${icon("coin", 13)} <b id="coins">160</b></span></div></div></section>
        <section class="quest-hud"><div class="eyebrow"><span></span> TUGAS RONDA</div><h3>Lima denting sebelum subuh</h3><p id="quest-desc">Bunyikan tiang listrik di sekitar desa.</p><div class="post-progress" id="post-progress"></div><div class="quest-foot"><span id="post-count">0 / 5 tiang</span>${button("map", "Lihat peta " + icon("arrow", 13), "text-button")}</div></section>
        <aside class="map-hud"><div class="time-row"><div id="time-icon">${icon("moon", 18)}</div><strong id="clock">19:12</strong><span id="night-label">MALAM 01</span></div><button class="minimap-button" data-action="map" aria-label="Buka peta desa"><canvas id="minimap" width="360" height="360"></canvas><span class="map-north">U</span><span class="map-expand">${icon("map", 15)} <kbd>M</kbd></span></button><div class="security-line"><span>${icon("shield", 13)} Keamanan desa</span><b id="security">84%</b></div><div class="meter security"><i id="security-fill"></i></div><div id="kliwon-label">✧ &nbsp; MALAM KLIWON</div></aside>
        <div id="village-alert"></div><div id="mount-status" class="hidden"><b id="mount-status-title"></b><span id="mount-status-hint"></span><div id="tractor-controls" class="hidden"><button data-action="tractor">U Angkat / jatuhkan</button></div><div id="tech-controls" class="hidden"><button data-action="mecha-flight">V Terbang / jalan</button><button data-action="missiles">H Misil</button></div></div>
        <div id="area-banner"><span>MEMASUKI WILAYAH</span><h2>Pos Ronda</h2><p>Tempat pulang. Tempat bertahan.</p></div>
        <div id="target-hud" class="hidden"><span id="target-category">ENTITAS LIAR</span><strong id="target-name">Pocong</strong><div class="meter enemy"><i id="enemy-fill"></i></div><small id="target-status">Tanah · Jawa</small></div>
        <div id="waypoint-hud" class="hidden">${icon("pin", 16)}<span></span></div>
        <div id="interaction" class="hidden"><kbd>E</kbd><div><small id="interaction-type">INTERAKSI</small><strong id="interaction-label">Bicara dengan Pak Wiryo</strong></div></div>
        <div id="toast" role="status" aria-live="polite"></div>
        <div class="bottom-left"><span id="safe-badge">${icon("shield", 14)} AREA AMAN</span><h4 id="location-label">Pos Ronda</h4><div class="weapon-tray"><button data-action="attack" class="equipment active"><kbd>1</kbd><span id="weapon-icon">${icon("bat", 28)}</span><i id="weapon-mini">Kentongan Jati</i></button><button data-action="flashlight" class="equipment" id="flash-slot"><kbd>F</kbd>${icon("light", 26)}<i>Senter</i></button><button data-action="capture" class="equipment"><kbd>R</kbd>${icon("bottle", 26)}<b id="bottle-count">6</b><i>Botol segel</i></button><button data-action="mount" class="equipment" id="mount-slot"><kbd>B</kbd>${icon("bike", 29)}<i id="mount-name">Onthel</i></button></div></div>
        <div class="skills"><button data-action="special" class="skill-button" id="special-button"><kbd>Q</kbd>${icon("bolt", 23)}<span>Pusaka</span><i></i></button><button data-action="companion" class="skill-button" id="companion-button"><kbd>G</kbd>${icon("ghost", 23)}<span id="companion-name">Pendamping</span><i></i></button><span class="skills-note">KLIK <b>Target</b> · SPASI <b>Serang</b></span></div>
        <footer class="control-footer"><span><kbd>W A S D</kbd> Bergerak</span><span><kbd>SHIFT</kbd> Lari</span><span><kbd>DRAG</kbd> Putar kamera</span><span><kbd>SCROLL</kbd> Zoom</span><span><kbd>E</kbd> Interaksi</span><span class="save-state"><i></i> Tersimpan lokal</span></footer>
        <div class="mobile-pad"><div id="move-joystick" aria-label="Joystick gerak karakter"><span class="joystick-knob"></span><span class="joystick-label">GERAK</span></div><button data-action="interact" aria-label="Interaksi">E</button></div>
        <section id="flight-controls" class="hidden" aria-label="Kontrol ketinggian tunggangan"><button data-action="ascend" data-flight="1" aria-label="Naik ketinggian" title="Naik ketinggian (T) — tekan atau tahan">${icon("up", 22)}</button><button data-action="descend" data-flight="-1" aria-label="Turun ketinggian" title="Turun ketinggian (C) — tekan atau tahan">${icon("down", 22)}</button></section><div id="first-tip"><span>${icon("light", 17)} SELAMAT DATANG DI SUKARAME</span><p>Dekati Pak Wiryo di pos. Tekan <kbd>E</kbd> untuk berbicara, atau <kbd>B</kbd> untuk naik sepeda.</p><button data-action="dismiss-tip" aria-label="Tutup petunjuk">${icon("close", 15)}</button></div>
      </div>
      <div id="modal-root"></div><div id="damage-flash"></div><div id="respawn-overlay" class="hidden"><span>FAJAR MASIH MENUNGGUMU</span><h2>Belum waktunya pulang.</h2><p>Warga membawamu kembali ke pos ronda.</p></div>`;
    this.root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (el) {
        if (el.dataset.flight && e.detail > 0) return;
        e.stopPropagation();
        this.handle(el.dataset.action, el.dataset);
      }
    });
    const flightControls = this.root.querySelector("#flight-controls");
    const releaseFlight = () => { this.game.flightInput = 0; };
    flightControls.addEventListener("pointerdown", e => {
      const button = e.target.closest("[data-flight]");
      if (!button || !this.game.isFlying || this.panel || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      button.setPointerCapture(e.pointerId);
      this.game.flightInput = Number(button.dataset.flight);
      this.game.action(button.dataset.action);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      flightControls.addEventListener(event, releaseFlight);
    window.addEventListener("blur", releaseFlight);
    document.addEventListener("visibilitychange", releaseFlight);
    this.joystick = new TouchJoystick(this.game, this.root.querySelector("#move-joystick"));
  }
  handle(action, d = {}) {
    this.game.audio.play("click");
    if (action === "start") {
      this.menuOpen = false;
      document.querySelector("#menu").classList.add("hidden");
      document.querySelector("#hud").classList.remove("hidden");
      this.game.start();
      return;
    }
    if (
      [
        "camp",
        "inventory",
        "bestiary",
        "journal",
        "map",
        "help",
        "settings",
      ].includes(action)
    ) {
      this.open(action);
      return;
    }
    if (action === "close") {
      this.close();
      return;
    }
    if (action === "camp-tab") {
      this.currentTab = d.tab;
      this.open("camp");
      return;
    }
    if (action === "dismiss-tip") {
      this.tipTimer = 0;
      document.querySelector("#first-tip").classList.add("hidden");
      return;
    }
    if (action === "ghost-detail") {
      this.selectedGhost = d.id;
      this.open("bestiary");
      return;
    }
    this.game.action(action, d);
  }
  toast(message, type = "normal") {
    const t = document.querySelector("#toast");
    t.innerHTML = `${icon(type === "error" ? "shield" : type === "success" ? "check" : "moon", 18)}<span>${message}</span>`;
    t.className = `show ${type}`;
    this.toastTimer = 4;
  }
  hurt() {
    const e = document.querySelector("#damage-flash");
    e.classList.remove("hit");
    void e.offsetWidth;
    e.classList.add("hit");
  }
  close() {
    this.panel = null;
    document.querySelector("#modal-root").innerHTML = "";
    this.game.keys.clear();
    this.game.flightInput = 0;
    this.joystick?.reset();
    this.game.dragging = false;
  }
  open(type) {
    if ((this.game.spirit?.active || this.game.magic?.active) && !["dialogue", "journal", "help", "settings"].includes(type)) {
      this.toast("Kembali ke desa untuk membuka menu ini.");
      return;
    }
    this.panel = type;
    this.game.keys.clear();
    this.game.flightInput = 0;
    this.joystick?.reset();
    this.game.dragging = false;
    const titles = {
      camp: ["ICI, ON VEILLE", "Le pos ronda"],
      inventory: ["PERLENGKAPAN PERJALANAN", "Bekal malam ini"],
      bestiary: ["CATATAN ALAM SEBERANG", "Almanak roh"],
      journal: ["KISAH KAMPUNG SUKARAME", "Jurnal penjaga"],
      map: ["KENALI JALAN PULANG", "Peta Sukarame"],
      help: ["BEKAL SEBELUM BERANGKAT", "Panduan ronda"],
      settings: ["AMBIL NAPAS SEJENAK", "Jeda perjalanan"],
    };
    titles.camp = ["TEMPAT PULANG & BERSIAP", "Pos ronda"];
    const nav = ["help", "settings", "dialogue"].includes(type)
      ? ""
      : `<nav class="panel-tabs">${tabs.map(([id, ic, label]) => button(id, `${icon(ic, 17)}${label}`, type === id ? "selected" : "")).join("")}</nav>`;
    const title = titles[type] || ["WARGA SUKARAME", "Percakapan"];
    document.querySelector("#modal-root").innerHTML =
      `<div class="modal-backdrop"><section class="panel ${type === "map" ? "map-panel" : ""}" role="dialog" aria-modal="true" aria-label="${title[1]}"><header class="panel-header"><div><span class="eyebrow">${title[0]}</span><h2>${title[1]}</h2></div>${button("close", icon("close", 23), "close-button", 'aria-label="Tutup"')}</header>${nav}<div class="panel-content" id="panel-content">${this.content(type)}</div><footer class="panel-footer"><span>${icon("coin", 14)} ${this.game.state.data.coins} koin <i>·</i> Waktu berhenti saat menu dibuka</span><span><kbd>ESC</kbd> Kembali</span></footer></section></div>`;
    if (type === "map") {
      this.drawMap(document.querySelector("#worldmap"), true);
      document.querySelector("#worldmap").addEventListener("click", (e) => {
        const c = e.currentTarget,
          r = c.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 820 - 410,
          z = ((e.clientY - r.top) / r.height) * 820 - 290;
        this.game.waypoint = { x, z };
        this.drawMap(c, true);
        this.toast("Penanda tujuan dipasang. Ikuti arah pada kompas.");
      });
    }
    document.querySelector(".close-button")?.focus({ preventScroll: true });
  }
  content(type) {
    const st = this.game.state,
      d = st.data,
      safe = this.game.isSafe;
    if (type === "help")
      return `<div class="note-box"><strong>Kabar baru · Sungai, keluarga & langit Sukarame</strong><p>Kopdes Bu Ratih (74, −16) sekarang menjual joran, umpan, kapsul dan bahan crafting. Dekati tepi sungai, mata air, telaga ladang, atau saluran sawah: E melempar, tunggu sambaran, E menarik. Bergerak membatalkan pancing. Panen jagung/gandum di selatan; jual panen dan ikan di Kopdes. Kuda Sembrani kini mendukung Spasi dan Q pusaka dari udara tanpa turun.</p><p>Mas Elon (66, 207) membuka Space Z di selatan. Terima bekal kapsul, lemahkan dua alien darat hingga HP ≤25%, klik dan R untuk menangkap. Divisi Z ikut menjaga desa dan menahan alien di ruang riset. Setelah misi selesai, naik roket untuk menjelajahi tiga lokasi antariksa: WASD, T/C ketinggian, Shift laju. Dekati planet, E mengambil sampel kristal. Tombol Pulang mengembalikanmu ke desa.</p><p>Meteor pada malam acak membawa empat gelombang raptor dengan T-Rex sebagai bos akhir. Buru dinosaurus pembawa tawanan atau dekati sarang barat daya (−244, 168) lalu E untuk membebaskan. Saat fajar mereka mundur. Sesudah meteor pertama, lima jenis dinosaurus jinak tinggal di wilayah terpisah; Pteranodon bersarang di pohon sawit. Temui Dr John di Sukarame Park (−230, 212), beri tiga pakan dengan E lalu klik dan R (kapsul). Dua jenis berbeda membuka GyroBall.</p><p>Rumah keluarga di samping pos ronda (15, −2) bisa dimasuki dengan E. Dekati Yuli, Aqila, Azkia, tempat tidur, atau peti untuk berinteraksi. Peti menyimpan barang dan koin; tabungan tidak terkena penalti respawn. Waktu desa berhenti selama berada di rumah atau ekspedisi. Progres tersimpan; saat membuka ulang game, kamu kembali ke desa.</p><p>Peternakan Pak Mulyono berada di barat daya (−112, 207). Terima quest, lalu rawat lima ternak berbeda dengan E untuk memperoleh Kuda Sembrani: B naik, T/C terbang. Gereja Santa Maria dengan Pastor Daniel dan biarawati berdiri di sebelah barat Masjid Raya.</p><p>Setelah quest pulang E.T. selesai, jatuhkan total tiga UFO musuh untuk membuka sinar pengangkat UFO milikmu. Klik musuh, U angkat, U lagi jatuhkan. Jatuhan dan misil mecha adalah damage fisik: tidak melukai hantu. Plasma, energi, dan pusaka tetap efektif. Semua musuh mengikuti level Hansip, termasuk bos; HP dan daya serang meningkat tanpa menyembuhkan luka saat naik level.</p><p>Pabrik Payung Korp dibuka setelah fajar pertama di timur laut. Bantu Prof William mengumpulkan tiga tabung riset untuk mendapatkan Laras Surya (Spasi tembak, Q ledakan surya). Basmi 12 zombie dan miliki Mecha Gundam untuk upgrade terbang dan misil.</p><p>Beberapa malam, sirine menandai wabah zombie; bintang jatuh menandai invasi alien. Empat gelombang, lalu bos. Jatuhkan UFO sebelum membawa sandera pergi; jatuhkan kapal induk untuk menyelamatkan semua sandera, sebelum fajar. Saat fajar zombie jadi abu dan alien kabur. Semua rumah otomatis pulih lewat gotong royong; warga dan ternak kembali sehat tanpa biaya. Santri menjaga masjid. Warga terinfeksi perlu dilumpuhkan lalu diobati dengan E; racik serum di William. Pertolongan dengan serum saat malam tetap memberi progres penyelamatan.</p><p>E.T. bersembunyi di sudut tenggara. Cari tiga komponen, kembalikan kepadanya untuk memperoleh sel bintang, aktifkan suar di sebelah UFO rusak, lalu terima UFO milikmu.</p><p>Klik tubuh hantu untuk mengunci target, X melepas, Spasi menyerang. Lima tiang aktif berganti setiap malam; lihat M. Kiai Hasan di Masjid Raya memberi misi menghentikan kiriman Ki Wulung di barat laut. Padamkan rumah terbakar dengan E.</p><p>Temui Bang Jalu di barat lapangan untuk Piala Tarkam (Spasi tembak, Q oper) dan Dimas di simpang dekat pos untuk balap dua lap. Naga Geni (700 koin) dan Mecha Gundam (950 koin) dipamerkan dan dijual di dalam Kopdes. Kuda peternakan (360 koin) dan traktor (620 koin) juga tersedia di sana. Dekati label harga dan tekan E. Naga: T naik, C turun, B mendarat; api otomatis pada target. Mecha: kebal sihir, Spasi plasma.</p></div><div class="help-intro">${icon("moon", 42)}<p>Segel Mustika Bumi telah pecah. Sukarame memerlukan penjaga.<br/>Bunyikan lima tiang, redam kejahatan, dan jinakkan roh untuk memulihkan segel.</p></div><div class="help-grid">${[
        ["W A S D / ↑ ↓ ← →", "Berjalan mengikuti arah kamera"],
        ["SHIFT", "Lari · menghabiskan stamina"],
        ["Klik musuh / X", "Kunci / lepas target"],
        ["SPASI / 1", "Serang dengan pusaka atau plasma mecha"],
        ["T / C", "Tunggangan terbang: naik / turun ketinggian"],
        ["V / H", "Mecha upgrade: terbang–berjalan / tiga misil fisik"],
        ["U", "UFO upgrade: angkat / jatuhkan target"],
        ["Q", "Skill pusaka · cooldown 8 detik"],
        ["G", "Skill pendamping · cooldown 12 detik"],
        ["R", "Botol hantu / kapsul dino & alien · klik target dahulu"],
        ["E", "Bicara, tiang, bahan, atau ritual terdekat"],
        ["B", "Naik / turun tunggangan"],
        ["F", "Nyalakan / matikan senter"],
        ["I / J / M / P", "Bekal / jurnal / peta / pos ronda"],
        ["Drag mouse / Arahkan sentuhan", "Putar kamera · gulir untuk zoom"],
        ["ESC", "Jeda / tutup panel"],
      ]
        .map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`)
        .join(
          "",
        )}</div><div class="note-box">Pos ronda memulihkan HP dan melindungimu dari musuh. Kehabisan HP membawamu pulang dengan penalti 15% koin (minimum 15, sebatas saldo). Siang berlangsung 4 menit; malam 8 menit. Malam Kliwon datang setiap 3 malam, dimulai malam pertama. Simpanan otomatis berada di browser ini.</div>`;
    if (type === "settings")
      return `<div class="settings-list"><div><span><strong>Suara dunia</strong><small>Jangkrik, angin, kentongan, dan pertarungan</small></span>${button("sound", d.settings.sound ? "Aktif" : "Nonaktif", "pill-button")}</div><div><span><strong>Kualitas visual</strong><small>Bayangan dan resolusi rendering</small></span>${button("quality", d.settings.quality === "high" ? "Tinggi" : "Hemat", "pill-button")}</div><div><span><strong>Simpan perjalanan</strong><small>Progres tersimpan di browser ini</small></span>${button("save", "Simpan sekarang", "pill-button")}</div>${this.game.pwa?.settingsHTML() || ""}<div><span><strong>Kembali ke halaman awal</strong><small>Perjalanan disimpan sebelum kembali</small></span>${button("menu", "Menu utama", "pill-button")}</div><div><span><strong>Perjalanan baru</strong><small>Menghapus progres setelah konfirmasi kedua</small></span>${button("reset-prompt", "Mulai ulang", "pill-button danger")}</div></div>`;
    if (type === "inventory")
      return `<div class="inventory-summary"><div class="profile-large">${icon("shield", 38)}<span>PAK HANSIP<strong>Penjaga level ${d.level}</strong><small>${d.xp} / ${d.level * 80} pengalaman</small></span></div><div class="inventory-stats"><span><b>${st.maxHp}</b>Daya tahan</span><span><b>${st.weapon.damage + d.upgrades.strength * 6}</b>Serangan</span><span><b>${d.stats.captured}</b>Roh ditangkap</span></div></div><h3 class="section-label">BAHAN & PERBEKALAN</h3><div class="resource-grid">${[
        ["bottles", "Botol segel", "bottle"],
        ["glass", "Kaca", "bottle"],
        ["herb", "Daun obat", "leaf"],
        ["iron", "Besi", "hammer"],
        ["essence", "Sari gaib", "ghost"],
        ["coins", "Koin", "coin"],
      ]
        .map(
          ([k, n, ic]) =>
            `<div>${icon(ic, 23)}<b>${d[k]}</b><span>${n}</span></div>`,
        )
        .join(
          "",
        )}</div><div class="note-box">Serum William: <b>${d.incidents.tech.serum}</b> · Sel bintang: <b>${d.incidents.tech.cells}</b> · Mecha: <b>${d.incidents.tech.mechaFlight ? "Sayap & misil terpasang" : "Belum di-upgrade"}</b><br/>Zombie dibasmi: ${d.stats.zombies} · Warga diselamatkan: ${d.stats.rescued} · Pesawat dijatuhkan: ${d.stats.ufoDown}</div><h3 class="section-label">BEKAL KOPDES & HASIL ALAM</h3><div class="resource-grid">${SHOP_ITEMS.filter(
        (i) => !i.base && !i.tool,
      )
        .map(
          (i) =>
            `<div>${icon("bag", 23)}<b>${d.frontier.bag[i.id] || 0}</b><span>${i.name}</span></div>`,
        )
        .join(
          "",
        )}</div><div class="note-box">Joran: ${["Belum punya", "Joran Bambu", "Reel Koperasi", "Joran Pusaka Tirta"][d.frontier.rod]} · Tabungan rumah: ${d.frontier.storage.coins || 0} koin · Atlas antariksa: ${d.frontier.spaceCollected.length}/3<br/>${button("frontier-waypoint", "Tandai Kopdes", "pill-button", 'data-id="kopdes-shop"')}</div>${this.game.frontier.journal()}<h3 class="section-label">ATLAS SUKARAME PARK</h3><div class="resource-grid">${DINOSAURS.map((e) => `<div>${icon("leaf", 23)}<b>${d.frontier.dinos.includes(e.id) ? "✓" : "—"}</b><span>${e.name}</span></div>`).join("")}</div><h3 class="section-label">SATU PUSAKA UNTUK DIBAWA</h3><div class="item-grid">${WEAPONS.filter(
        (w) => d.weapons.includes(w.id),
      )
        .map((w) => this.weaponCard(w, false))
        .join(
          "",
        )}</div><h3 class="section-label">TUNGGANGAN KOLEKSI</h3><div class="item-grid">${MOUNTS.filter(
        (m) => d.mounts.includes(m.id),
      )
        .map(
          (m) =>
            `<div class="item-card">${icon("bike", 30)}<h3>${m.name}</h3><p>${m.desc}</p>${button("equip-mount", d.mount === m.id ? "Sedang dipakai" : "Gunakan", "pill-button", `data-id="${m.id}" ${d.mount === m.id ? "disabled" : ""}`)}</div>`,
        )
        .join("")}</div>`;
    if (type === "camp") {
      if (!safe)
        return `<div class="empty-state">${icon("home", 50)}<h3>Cahaya pos menunggumu.</h3><p>Koleksi dan istirahat tersedia di pos ronda. Pembelian, racikan, dan upgrade berada di dalam Kopdes.</p>${button("home-waypoint", "Tandai jalan pulang " + icon("arrow", 17), "primary")}</div>`;
      const menu = `<div class="camp-intro">${icon("shield", 19)} <span>Dalam lindungan. Pulihkan tubuh, siapkan malam berikutnya.</span></div><div class="subtabs">${[
        ["forge", "Koleksi pusaka"],
        ["upgrade", "Kemampuan"],
        ["mounts", "Tunggangan"],
        ["rest", "Istirahat"],
      ]
        .map(([id, t]) =>
          button(
            "camp-tab",
            t,
            this.currentTab === id ? "selected" : "",
            `data-tab="${id}"`,
          ),
        )
        .join("")}</div>`;
      const storeLink = `<div class="note-box">Pembelian, racikan, dan pelatihan tersedia di dalam Kopdes. Di pos kamu bisa melihat koleksi dan memakai perlengkapan.${button("frontier-waypoint", "Tandai Kopdes", "pill-button", 'data-id="kopdes-shop"')}</div>`;
      if (this.currentTab === "forge") return menu + storeLink + `<div class="item-grid">${WEAPONS.map(w => this.weaponCard(w, false)).join("")}</div>`;
      if (this.currentTab === "upgrade") return menu + storeLink + `<div class="item-grid">${["health","strength","stamina","ward"].map((key,i)=>`<div class="item-card"><h3>${["Raga tangguh","Tangan terlatih","Napas panjang","Pagar batin"][i]}</h3><p>Tingkat ${d.upgrades[key]} / 5</p></div>`).join("")}</div>`;
      if (this.currentTab === "mounts") return menu + storeLink + `<div class="item-grid">${MOUNTS.map(m=>`<div class="item-card">${icon(m.icon||"bike",36)}<h3>${m.name}</h3><p>${m.desc}</p><small>${d.mounts.includes(m.id)?"Milikmu":m.questOnly?"Hadiah quest":`${m.cost} koin di Kopdes`}</small>${d.mounts.includes(m.id)?button("equip-mount",d.mount===m.id?"Sedang dipakai":"Gunakan","pill-button",`data-id="${m.id}" ${d.mount===m.id?"disabled":""}`):""}</div>`).join("")}</div>`;
      return (
        menu +
        `<div class="rest-card">${icon(st.isNight ? "sun" : "moon", 52)}<h3>${st.isNight ? "Tunggu fajar datang." : "Bersiap untuk malam berikutnya."}</h3><p>Istirahat mengisi HP dan stamina hingga penuh.<br/>${st.isNight ? "Waktu maju ke pukul 06:30. Ronda yang belum selesai ditinggalkan." : "Waktu maju ke pukul 18:30. Lima tiang harus dibunyikan kembali."}</p>${button("rest", st.isNight ? "Istirahat hingga pagi" : "Istirahat hingga malam", "primary")}</div>`
      );
    }
    if (type === "bestiary") {
      const selected = GHOSTS.find((g) => g.id === this.selectedGhost);
      let detail = "";
      if (selected) {
        const own = d.collection.find((g) => g.id === selected.id);
        detail = `<div class="ghost-detail ${own ? "owned" : "unowned"}" style="--element:${ELEMENTS[selected.element]}"><div class="ghost-emblem"><img class="ghost-portrait" src="/portraits/${selected.id}.png" alt="${selected.name}" width="256" height="320"></div><div><span class="eyebrow">${selected.region} · ${selected.element}</span><h3>${selected.name}${own?.awakened ? " · Awakened" : ""}</h3><p>${selected.story}</p><small>${own ? `Level ${own.level} / 5 · ${own.xp} EXP · ${own.awakened ? "Ultimate terbuka" : "Roh milikmu"}` : `HP liar ${selected.hp} · Wilayah jaga ${selected.radius} m`}</small><div class="inline-actions">${GHOST_VOICES.has(selected.id) ? button("ghost-voice", "Dengarkan suara", "pill-button", `data-id="${selected.id}"`) : ""}${own ? button("equip-ghost", d.companion === selected.id ? "Sedang mendampingi" : "Jadikan pendamping", "pill-button", `data-id="${selected.id}" ${d.companion === selected.id ? "disabled" : ""}`) : '<span class="muted">Tangkap dengan botol ketika HP ≤ 25%.</span>'}${own && !own.awakened ? button("awaken", "Awakening", "pill-button", `data-id="${selected.id}" ${own.level < 5 || !st.afford({ coins: 200, essence: 8, iron: 6 }) || !safe ? "disabled" : ""}`) : ""}</div>${own && !own.awakened ? "<small>Awakening di pos: level 5 · 200 koin · 8 sari gaib · 6 besi</small>" : ""}</div></div>`;
      }
      return `<div class="section-intro"><span>${d.collection.length} / ${GHOSTS.length} ROH TERKOLEKSI</span><p>Satu pendamping. Lima elemen. Banyak cara menjaga malam.</p></div>${detail}<div class="bestiary-grid">${GHOSTS.map(
        (g) => {
          const own = d.collection.find((a) => a.id === g.id);
          return button(
            "ghost-detail",
            `<div class="ghost-art" style="--ghost-glow:${ELEMENTS[g.element]}"><img class="ghost-portrait" src="/portraits/${g.id}.png" alt="${g.name}" width="256" height="320" loading="lazy"></div><span class="ghost-region">${g.global ? "PORTAL KLIWON" : g.region}</span><strong>${g.name}</strong><small>${own ? `Lv. ${own.level}${own.awakened ? " ✧" : ""}` : `Belum dimiliki · ${g.element}`}</small>${own ? '<i class="owned-dot"></i>' : ""}`,
            `ghost-card ${own ? "owned" : ""} ${this.selectedGhost === g.id ? "selected" : ""}`,
            `data-id="${g.id}"`,
          );
        },
      ).join(
        "",
      )}</div><div class="note-box">Api + Angin membentuk Tornado Api. Air + Tanah membentuk Akar Pasang. Elemen sama memperkuat resonansi. Pendamping memperoleh EXP setiap pertarungan; awakening membuka serangan area yang lebih besar.</div>`;
    }
    if (type === "journal")
      return `${this.game.magic?.journal() || ""}${this.game.coast?.journal() || ""}${this.game.spirit?.journal() || ""}<div class="note-box">Ekspedisi baru: ${button("frontier-waypoint", "Mas Elon · Space Z", "pill-button", 'data-id="elon"')} ${button("frontier-waypoint", "Dr John · Sukarame Park", "pill-button", 'data-id="john"')}<p>Dinosaurus: ${d.stats.dinoTagged}/5 jenis · Alien ditangkap: ${d.stats.aliensCaptured} · Antariksa: ${d.frontier.spaceCollected.length}/3 lokasi</p></div><div class="story-block"><span class="eyebrow">PROLOG · SEGEL YANG PECAH</span><h3>Malam tak lagi sekadar gelap.</h3><p>Sindikat curanmor membongkar makam keramat untuk menyembunyikan jarahan. Segel Mustika Bumi pecah. Murka Nyi Roro Kidul membuka celah ke alam gaib, dan Sukarame kehilangan batas antara yang hidup dan yang mati.</p></div><div class="quest-list">${QUESTS.map(
        (q) => {
          const status = d.quests[q.id],
            progress = Math.min(q.target, d.stats[q.stat]);
          return `<div class="journal-quest ${status === "done" ? "complete" : ""}"><span class="quest-symbol">${icon(status === "done" ? "check" : status ? "moon" : "book", 24)}</span><div><span class="eyebrow">${status === "done" ? "SELESAI" : status ? "SEDANG BERJALAN" : "TEMUI WARGA UNTUK MEMULAI"}</span><h3>${q.name}</h3><p>${q.description}</p><small>${q.coins} koin · ${q.essence} sari gaib</small></div><span class="quest-number">${progress} / ${q.target}</span></div>`;
        },
      ).join("")}</div>`;
    if (type === "map")
      return `<div class="map-layout"><div class="map-canvas-wrap"><canvas id="worldmap" width="800" height="800" aria-label="Peta desa, klik untuk menetapkan tujuan"></canvas><div class="map-scale">0 ───── 100 m <span>U ↑</span></div></div><aside class="map-legend"><span class="eyebrow">LIMA TITIK RONDA · BERGANTI SETIAP MALAM</span>${st.patrolPosts.map((p, i) => button("post-waypoint", `<b>${d.posts.includes(p.id) ? "✓" : String(i + 1).padStart(2, "0")}</b><span>${p.name}<small>${Math.round(distance(d, p))} meter</small></span>`, "map-post", `data-id="${p.id}"`)).join("")}<div class="legend-items"><span><i class="legend-dot player"></i> Kamu</span><span><i class="legend-dot safe"></i> Pos ronda</span><span><i class="legend-dot ghost"></i> Wilayah roh</span><span><i class="legend-dot portal"></i> Portal Kliwon</span></div><p>Karang Tirta (20, 335) tersambung melalui jalan pesisir selatan. Dermaga (84, 330), mercusuar (30, 440), dan Pulau Karang (190, 420). Temui Bu Sari untuk quest dan perahu motor. Space Z (78, 225), Dr John / Sukarame Park (−230, 212), sarang meteor (−244, 168), ladang jagung/gandum di selatan, dan rumah keluarga (15, −2). Pabrik Payung Korp / William berada di timur laut (227, −212), E.T. dan suar di sudut tenggara (259, 224). Peternakan Pak Mulyono di barat daya (−112, 207). Gereja Santa Maria (29, −179), Masjid Raya, dan pesantren berada di utara. Rumah Ki Wulung di barat laut. Panitia Tarkam di sisi barat lapangan; Dimas menunggu di simpang dekat pos. Klik peta untuk menandai tujuan. Jelajahi desa dengan <kbd>B</kbd> untuk naik sepeda.</p></aside></div>`;
    return "";
  }
  weaponCard(w, craft) {
    const d = this.game.state.data,
      owned = d.weapons.includes(w.id);
    return `<div class="item-card ${d.weapon === w.id ? "equipped" : ""}"><span class="item-art" style="color:${ELEMENTS[w.element]}">${icon(w.icon,34)}</span><span class="item-tag">${w.element} · ${w.damage} ATK</span><h3>${w.name}</h3><p>${w.desc}</p><small class="cost">${owned?"Milikmu":w.questOnly?`Hadiah quest ${w.questNpc||"warga"}`:costText(w.cost)+" · Kopdes"}</small>${owned?button("equip-weapon",d.weapon===w.id?"Sedang dipakai":"Gunakan","pill-button",`data-id="${w.id}" ${d.weapon===w.id?"disabled":""}`):""}</div>`;
  }
  dialogue(npc) {
    this.open("dialogue");
    const d = this.game.state.data,
      q = QUESTS.find((q) => q.id === npc.quest),
      status = d.quests[npc.quest],
      ready =
        q &&
        d.stats[q.stat] >= q.target &&
        (!q.requiresMount || d.mounts.includes(q.requiresMount)) &&
        (!q.requiresQuest || d.quests[q.requiresQuest] === "done");
    document.querySelector("#panel-content").innerHTML =
      `<div class="dialogue-content"><div class="speaker-portrait">${icon(npc.id === "juru" ? "moon" : "shield", 52)}</div><span class="eyebrow">${npc.role}</span><h2>${npc.name}</h2><p class="dialogue-line">“${npc.line}”</p>${q ? `<div class="dialogue-quest"><span class="eyebrow">${status === "done" ? "TERIMA KASIH, PENJAGA." : "PERMINTAAN WARGA"}</span><h3>${q.name}</h3><p>${q.description}</p><small>Imbalan: ${q.coins} koin · ${q.essence} sari gaib${q.mount ? " · " + MOUNTS.find((m) => m.id === q.mount)?.name : q.id === "et-tractor" ? " · Sinar pengangkat UFO" : ""}</small></div>` : ""}<div class="dialogue-actions">${q && status !== "done" ? button(status ? "claim-quest" : "accept-quest", status ? (ready ? "Serahkan & terima imbalan" : `Belum selesai · ${Math.min(q.target, d.stats[q.stat])}/${q.target}`) : "Saya akan membantu", "primary", `data-id="${q.id}" ${status && !ready ? "disabled" : ""}`) : ""}${npc.heal ? button("meal", "Makan bersama · Pulihkan HP", "primary") : ""}${npc.bribe ? button("report-bribe", d.bribeDay === d.night ? "Sudah dilaporkan hari ini" : "Tolak amplop & laporkan · +25 koin", "primary", d.bribeDay === d.night ? "disabled" : "") : ""}${button("close", "Sampai jumpa", "text-button")}</div></div>`;
    if (npc.id === "elon")
      document
        .querySelector(".dialogue-actions")
        .insertAdjacentHTML(
          "afterbegin",
          button(
            "space-launch",
            d.frontier.spaceUnlocked
              ? "Naik roket · Jelajah antariksa"
              : "Roket terkunci · Selesaikan misi",
            "primary",
            d.frontier.spaceUnlocked ? "" : "disabled",
          ),
        );
    if (["william", "et"].includes(npc.id))
      document
        .querySelector(".dialogue-actions")
        .insertAdjacentHTML(
          "beforeend",
          button(
            "story-waypoint",
            "Tandai tujuan cerita",
            "pill-button",
            'data-id="' + npc.id + '"',
          ),
        );
    if (npc.id === "william")
      document
        .querySelector(".dialogue-actions")
        .insertAdjacentHTML(
          "afterbegin",
          button(
            "mix-serum",
            `Racik serum · 2 daun + 1 sari (punya ${d.incidents.tech.serum})`,
            "pill-button",
          ),
        );
    if (npc.activity)
      document
        .querySelector(".dialogue-actions")
        .insertAdjacentHTML(
          "afterbegin",
          button(
            "start-" + npc.activity,
            npc.activity === "football"
              ? "Daftar Piala Tarkam · 3 lawan 3"
              : "Ikut Bocil Gowes · 2 lap",
            "primary",
          ),
        );
  }
  /* Activities are started by their local organizer's dialogue. */
  update(dt) {
    const g = this.game,
      st = g.state,
      d = st.data;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0)
        document.querySelector("#toast").classList.remove("show");
    }
    if (this.menuOpen) return;
    this.tipTimer -= dt;
    if (this.tipTimer <= 0)
      document.querySelector("#first-tip").classList.add("hidden");
    const set = (id, t) => {
      const e = document.getElementById(id);
      if (e && e.textContent !== String(t)) e.textContent = t;
    };
    set("level", d.level);
    set("health-text", `${Math.ceil(d.hp)} / ${st.maxHp}`);
    set("coins", d.coins);
    const raids = g.enemies.filter((e) => e.raid && e.active),
      fires = [
        ...d.raid.fires.filter((f) => f.heat > 0),
        ...(d.weather?.fires || []),
      ];
    set(
      "village-alert",
      "KAS WARGA " +
        Math.floor(d.village.treasury) +
        " · " +
        (fires.length
          ? fires.length + " TITIK API"
          : raids.length
            ? raids.length + " KIRIMAN DUKUN"
            : d.raid.suppressed
              ? "RITUAL DIPUTUS"
              : "KAMPUNG TERJAGA"),
    );
    document
      .querySelector("#village-alert")
      .classList.toggle("danger", !!(raids.length || fires.length));
    const mounted =
        d.riding && ["naga", "mecha", "ufo", "sembrani"].includes(d.mount),
      flight = g.isFlying;
    document
      .querySelector("#mount-status")
      .classList.toggle("hidden", !mounted || !!g.sports.active);
    set(
      "mount-status-title",
      (
        MOUNTS.find((m) => m.id === d.mount)?.name || "Tunggangan"
      ).toUpperCase() +
        (flight ? ` · ${Math.round(g.altitude)} m` : " · BERJALAN"),
    );
    set(
      "mount-status-hint",
      d.mount === "naga"
        ? "Klik musuh: sembur otomatis · B mendarat"
        : d.mount === "sembrani"
          ? "Spasi / Q pusaka · T/C tinggi · B mendarat"
          : d.mount === "ufo" && d.incidents.tech.ufoTractor
            ? g.tractor.held
              ? "Target terangkat · U jatuhkan"
              : "Klik target · U angkat · Spasi energi"
            : "Klik musuh · Spasi tembak · B turun",
    );
    document
      .querySelector("#flight-controls")
      .classList.toggle("hidden", !flight || !!g.sports.active || !!this.panel || !!g.coast?.boating);
    if (!flight || this.panel) g.flightInput = 0;
    document
      .querySelector("#tech-controls")
      .classList.toggle(
        "hidden",
        !(d.mount === "mecha" && d.incidents.tech.mechaFlight),
      );
    document
      .querySelector("#tractor-controls")
      .classList.toggle(
        "hidden",
        !(d.mount === "ufo" && d.incidents.tech.ufoTractor),
      );
    set("bottle-count", d.bottles);
    set("security", `${Math.round(d.security)}%`);
    document.querySelector("#hp-fill").style.width =
      `${(d.hp / st.maxHp) * 100}%`;
    document.querySelector("#stamina-fill").style.width =
      `${(d.stamina / st.maxStamina) * 100}%`;
    document.querySelector("#security-fill").style.width = `${d.security}%`;
    set(
      "clock",
      `${String(Math.floor(d.time / 60) % 24).padStart(2, "0")}:${String(Math.floor(d.time % 60)).padStart(2, "0")}`,
    );
    set(
      "night-label",
      `${st.isNight ? "MALAM" : "SIANG"} ${String(d.night).padStart(2, "0")}`,
    );
    document.querySelector("#time-icon").innerHTML = icon(
      st.isNight ? "moon" : "sun",
      18,
    );
    document.querySelector("#kliwon-label").style.opacity =
      st.isKliwon && st.isNight ? "1" : ".2";
    set("post-count", `${d.posts.length} / 5 tiang`);
    document.querySelector("#post-progress").innerHTML = st.patrolPosts
      .map((p) => `<i class="${d.posts.includes(p.id) ? "done" : ""}"></i>`)
      .join("");
    set(
      "quest-desc",
      d.posts.length === 5
        ? d.quests.patrol === "done"
          ? "Ronda tuntas. Bantu warga mengungkap misteri."
          : "Ronda tuntas. Laporkan kepada Pak Wiryo."
        : st.isNight
          ? "Bunyikan tiang listrik di sekitar desa."
          : "Siapkan bekal sebelum malam tiba.",
    );
    const zone = g.world.zone(d.x, d.z);
    set("zone-top", zone.name.toUpperCase());
    set("location-label", zone.name);
    document.querySelector("#safe-badge").style.opacity = g.isSafe ? "1" : "0";
    document.querySelector("#status-label").innerHTML =
      `<i class="${g.isSafe ? "" : "outside"}"></i> ${g.isSafe ? "Dalam lindungan" : d.riding ? (d.mount === "naga" ? "Terbang menjaga desa" : d.mount === "mecha" ? "Perisai sihir aktif" : "Berkeliling desa") : "Sedang berjaga"}`;
    if (zone.name !== this.lastZone) {
      this.lastZone = zone.name;
      const b = document.querySelector("#area-banner");
      b.querySelector("h2").textContent = zone.name;
      b.querySelector("p").textContent = zone.sub;
      b.classList.remove("visible");
      void b.offsetWidth;
      b.classList.add("visible");
    }
    const w = st.weapon;
    set("weapon-mini", w.name);
    document.querySelector("#weapon-icon").innerHTML = icon(w.icon, 28);
    document.querySelector("#flash-slot").classList.toggle("active", g.flashOn);
    document.querySelector("#mount-slot").classList.toggle("active", d.riding);
    set(
      "mount-name",
      MOUNTS.find((m) => m.id === d.mount)?.name.replace("Sepeda ", "") ||
        "Onthel",
    );
    set(
      "companion-name",
      d.companion
        ? GHOSTS.find((a) => a.id === d.companion).name
        : "Pendamping",
    );
    for (const [id, t, max] of [
      ["special-button", g.cooldowns.special, 8],
      ["companion-button", g.cooldowns.companion, 12],
    ]) {
      document.querySelector(`#${id} i`).style.height = `${(t / max) * 100}%`;
      document.querySelector(`#${id}`).classList.toggle("cooldown", t > 0);
    }
    const a = ((((g.cameraYaw * 180) / Math.PI) % 360) + 360) % 360;
    const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    set("compass-center", dirs[Math.round(a / 45) % 8]);
    const near =
      g.frontier?.celebration > 0 || g.frontier?.fishing
        ? null
        : g.interactable;
    document.querySelector("#interaction").classList.toggle("hidden", !near);
    if (near) {
      set(
        "interaction-type",
        near.type === "npc"
          ? "WARGA SUKARAME"
          : near.type === "post"
            ? "TUGAS RONDA"
            : near.type === "camp"
              ? "AREA AMAN"
              : "INTERAKSI",
      );
      set("interaction-label", near.label);
    }
    const enemy = g.target;
    document.querySelector("#target-hud").classList.toggle("hidden", !enemy);
    if (enemy) {
      set("target-name", enemy.name);
      set(
        "target-category",
        (g.lockedTarget
          ? "TARGET TERKUNCI · X LEPAS"
          : enemy.human
            ? "ANCAMAN KAMPUNG"
            : "ENTITAS LIAR") + ` · LV. ${enemy.level || d.level}`,
      );
      document.querySelector("#enemy-fill").style.width =
        `${(enemy.hp / enemy.maxHp) * 100}%`;
      set(
        "target-status",
        !enemy.human && !enemy.incident && enemy.hp / enemy.maxHp <= 0.25
          ? "LEMAH · Tekan R untuk menangkap"
          : enemy.dino
            ? `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP · E pakan · R kapsul (${d.frontier.fed[enemy.def.id] || 0}/3 percaya)`
            : enemy.incident
              ? `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP · ${enemy.def.air ? "Target udara" : "Ancaman invasi"}`
              : enemy.human
                ? "Amankan dengan kentongan atau pusaka"
                : `${enemy.def.element} · Kebal misil & jatuhan fisik`,
      );
    }
    document
      .querySelector("#waypoint-hud")
      .classList.toggle("hidden", !g.waypoint);
    if (g.waypoint)
      document.querySelector("#waypoint-hud span").textContent =
        `Tujuan · ${Math.round(distance(d, g.waypoint))} m`;
    this.drawMap(document.querySelector("#minimap"), false);
  }
  drawMap(canvas, full = false) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d"),
      s = canvas.width,
      st = this.game.state,
      d = st.data;
    const span = full ? 820 : 165,
      cx = full ? 0 : d.x,
      cz = full ? 120 : d.z,
      scale = s / span;
    const X = (x) => (x - cx) * scale + s / 2,
      Y = (z) => (z - cz) * scale + s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#25342e";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(206,217,184,.06)";
    ctx.lineWidth = 1;
    for (let n = -400; n <= 550; n += 25) {
      ctx.beginPath();
      ctx.moveTo(X(n), 0);
      ctx.lineTo(X(n), s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, Y(n));
      ctx.lineTo(s, Y(n));
      ctx.stroke();
    }
    ctx.fillStyle = "#385b53";
    ctx.fillRect(X(143), Y(-280), 24 * scale, 565 * scale);
    ctx.fillStyle = "#387383";
    ctx.fillRect(X(60), Y(285), 220 * scale, 235 * scale);
    ctx.fillStyle = "#b5aa7e";
    ctx.beginPath(); ctx.arc(X(190), Y(420), 27 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ab9268";
    ctx.fillRect(X(60), Y(326), 28 * scale, 8 * scale);
    ctx.fillRect(X(158), Y(416), 14 * scale, 8 * scale);
    for (const r of this.game.world.roads) {
      ctx.fillStyle = "#686a51";
      ctx.fillRect(
        X(r.x - r.w / 2),
        Y(r.z - r.d / 2),
        r.w * scale,
        r.d * scale,
      );
    }
    ctx.fillStyle = "rgba(141,189,148,.13)";
    ctx.beginPath();
    ctx.arc(X(0), Y(0), 23 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#829a78";
    ctx.stroke();
    for (const z of ZONES) {
      if (z.icon === "home" || z.icon === "bag" || z.icon === "fire") {
        ctx.fillStyle = "#96977c";
        ctx.fillRect(X(z.x) - 5, Y(z.z) - 4, 10, 8);
      }
      if (full) {
        ctx.fillStyle = "#bdc6af";
        ctx.font = "500 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(z.name, X(z.x), Y(z.z) + 17);
      }
    }
    for (const e of this.game.enemies) {
      if (e.human || !e.active) continue;
      ctx.strokeStyle = e.def.global
        ? "rgba(187,142,204,.28)"
        : "rgba(171,137,111,.23)";
      ctx.beginPath();
      ctx.arc(
        X(e.home.x),
        Y(e.home.z),
        (e.raid ? 0 : e.def.radius) * scale,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.fillStyle = e.incident
        ? e.def.air || e.def.kind === "alien"
          ? "#a3dfef"
          : "#becf75"
        : e.raid
          ? "#f37b59"
          : e.def.global
            ? "#b79dcc"
            : "#a88f78";
      ctx.beginPath();
      ctx.arc(X(e.pos.x), Y(e.pos.z), full ? 2.5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.game.magic?.ready) {
      ctx.fillStyle = "#bda7ec";
      ctx.fillRect(X(STATION.x) - 5, Y(STATION.z) - 4, 10, 8);
      if (!d.magic.ticket) {
        ctx.beginPath(); ctx.arc(X(LARAS.x), Y(LARAS.z), 3, 0, Math.PI * 2); ctx.fill();
        if (full) {ctx.font = "500 11px sans-serif"; ctx.fillText("Bu Laras", X(LARAS.x), Y(LARAS.z) - 8);}
      }
    }
    for (const p of this.game.world.incidentWorld.pickups) {
      if (
        d.incidents.collected.includes(p.id) ||
        (p.id.startsWith("lab") && !d.incidents.labBuilt)
      )
        continue;
      ctx.fillStyle = p.id.startsWith("lab") ? "#d5dc98" : "#99deeb";
      ctx.fillRect(X(p.x) - 3, Y(p.z) - 3, 6, 6);
    }
    for (const h of this.game.world.houses) {
      if ((d.incidents.houses[h.id] ?? 100) >= 100) continue;
      ctx.strokeStyle = "#ed9675";
      ctx.strokeRect(X(h.x) - 4, Y(h.z) - 4, 8, 8);
    }
    if (d.weather?.type === "tornado" && this.game.weather) {
      const p = this.game.weather.tornado.position;
      ctx.strokeStyle = "#f4bb90";
      ctx.fillStyle = "#eaa87b33";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.z), Math.max(5, 12 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (full) {
        ctx.fillStyle = "#f4bb90";
        ctx.fillText("Tornado", X(p.x), Y(p.z) - 15);
      }
    }
    for (const v of Object.values(d.incidents.residents))
      if (v.condition === "injured") {
        ctx.fillStyle = "#f7c283";
        ctx.fillRect(X(v.x) - 3, Y(v.z) - 3, 6, 6);
      }
    st.patrolPosts.forEach((p, i) => {
      ctx.beginPath();
      ctx.fillStyle = d.posts.includes(p.id) ? "#8abc95" : "#e5c588";
      ctx.arc(X(p.x), Y(p.z), full ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (full) {
        ctx.fillStyle = "#26352c";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(i + 1, X(p.x), Y(p.z) + 3.5);
      }
    });
    if (this.game.sports?.active === "race") {
      ctx.strokeStyle = "#b8ba83";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      RACE_TRACK.forEach((p, i) =>
        i ? ctx.lineTo(X(p.x), Y(p.z)) : ctx.moveTo(X(p.x), Y(p.z)),
      );
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.game.waypoint) {
      const p = this.game.waypoint;
      ctx.strokeStyle = "#ebd397";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(X(d.x), Y(d.z));
      ctx.lineTo(X(p.x), Y(p.z));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeRect(X(p.x) - 6, Y(p.z) - 6, 12, 12);
    }
    ctx.save();
    ctx.translate(X(d.x), Y(d.z));
    ctx.rotate(Math.PI - this.game.facing);
    ctx.fillStyle = "#f0ead2";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (!full) {
      const grad = ctx.createRadialGradient(
        s / 2,
        s / 2,
        s * 0.27,
        s / 2,
        s / 2,
        s * 0.53,
      );
      grad.addColorStop(0, "rgba(12,25,20,0)");
      grad.addColorStop(1, "rgba(12,25,20,.65)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
    }
  }
}
