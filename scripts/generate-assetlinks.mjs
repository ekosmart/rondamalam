import fs from "node:fs/promises";
const name = process.env.ANDROID_PACKAGE_ID,
  prints = (process.env.ANDROID_SHA256 || "")
    .split(",")
    .map((s) => s.trim().toUpperCase());
if (
  !/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*){2,}$/.test(name || "") ||
  !prints.length ||
  prints.some((s) => !/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(s))
) {
  console.error(
    "Isi ANDROID_PACKAGE_ID dan ANDROID_SHA256 (fingerprint SHA-256 sertifikat asli, XX:XX:…; beberapa fingerprint dipisah koma).",
  );
  process.exit(1);
}
const output = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: name,
      sha256_cert_fingerprints: prints,
    },
  },
];
await fs.mkdir("public/.well-known", { recursive: true });
await fs.writeFile(
  "public/.well-known/assetlinks.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  "Digital Asset Links ditulis. Build dan redeploy sebelum memverifikasi TWA.",
);
