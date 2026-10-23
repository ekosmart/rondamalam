import * as THREE from "three";

// Adapted from the supplied wind-sway.js. All meshes and shadow passes share
// one clock; instance position provides phase variation with no per-tree CPU work.
export const windTime = { value: 0 };
export const windWeather = { value: 1 };
export function applyWindSway(
  material,
  { height = 2, strength = 0.12, speed = 1.6, dir = [1, 0.35] } = {},
) {
  const m = material.clone();
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uPlantTime: windTime,
      uPlantWeather: windWeather,
      uPlantHeight: { value: height },
      uPlantStrength: { value: strength },
      uPlantSpeed: { value: speed },
      uPlantDir: { value: new THREE.Vector2(...dir).normalize() },
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float uPlantTime, uPlantWeather, uPlantHeight, uPlantStrength, uPlantSpeed;
      uniform vec2 uPlantDir;
    `,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float bend = pow(clamp(position.y / uPlantHeight, 0.0, 1.0), 2.0);
      vec2 wp = modelMatrix[3].xz;
      #ifdef USE_INSTANCING
        wp += instanceMatrix[3].xz;
      #endif
      float ph = wp.x * 0.35 + wp.y * 0.25;
      float gust = sin(uPlantTime * uPlantSpeed + ph) + 0.5 * sin(uPlantTime * uPlantSpeed * 2.3 + ph * 1.7);
      transformed.xz += uPlantDir * gust * uPlantStrength * uPlantWeather * bend * uPlantHeight;
    `,
      );
    m.userData.windShader = shader;
  };
  m.customProgramCacheKey = () =>
    `plant-wind-${height}-${strength}-${speed}-${dir.join(",")}`;
  return m;
}
