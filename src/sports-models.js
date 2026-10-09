import * as THREE from "three";
import { makeHuman, box, mesh } from "./models.js";

const teamColors = ["#208bea", "#f77624"];
const markerTextures = new Map();

function teamMarker(team, controlled) {
  const key = controlled ? "player" : team;
  if (!markerTextures.has(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    if (controlled) {
      ctx.moveTo(15, 22);
      ctx.lineTo(81, 22);
      ctx.lineTo(48, 78);
      ctx.closePath();
    } else if (team === 0) ctx.arc(48, 48, 28, 0, Math.PI * 2);
    else {
      ctx.moveTo(48, 12);
      ctx.lineTo(84, 48);
      ctx.lineTo(48, 84);
      ctx.lineTo(12, 48);
      ctx.closePath();
    }
    ctx.fillStyle = controlled ? "#ffdf69" : teamColors[team];
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    markerTextures.set(key, texture);
  }
  const marker = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: markerTextures.get(key),
      depthWrite: false,
      toneMapped: false,
    }),
  );
  marker.position.y = controlled ? 3.65 : 3.35;
  marker.scale.setScalar(controlled ? 1.2 : 0.9);
  marker.userData.role = controlled
    ? "player"
    : team === 0
      ? "teammate"
      : "opponent";
  return marker;
}

export function makeFootballer(team, number, controlled = false) {
  const player = makeHuman(teamColors[team]);
  const torso = player.userData.torso;
  // Different stripe patterns and marker shapes remain legible without relying on color alone.
  if (team === 0) box(torso, 0.89, 0.16, 0.56, "#f3f6ee", 0, 1.73, 0);
  else
    for (const x of [-0.21, 0.21])
      box(torso, 0.1, 0.82, 0.56, "#422c24", x, 1.55, 0);
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.font = "bold 74px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(number, 32, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const jerseyNumber = mesh(
    torso,
    new THREE.PlaneGeometry(0.38, 0.52),
    mat,
    0,
    1.53,
    -0.287,
  );
  jerseyNumber.rotation.y = Math.PI;
  const marker = teamMarker(team, controlled);
  player.add(marker);
  player.userData.team = team;
  player.userData.teamMarker = marker;
  return player;
}
