# Keris Mpu Gandring

Original stylized game asset made in the live Blender session through Blender MCP.
This seven-luk fantasy interpretation is not a historical reconstruction.

- Source: `keris-mpu-gandring.blend` (dedicated asset scene; mesh marked as a Blender asset).
- Portable model: `public/models/weapons/keris-mpu-gandring.glb`.
- Game geometry: `src/assets/keris-mpu-gandring.json`, exported from the same Blender triangles.
- 1,094 triangles, seven solid-color material batches, no external textures.
- Source height: 0.784 metres. Blender Z-up; exports Y-up. Origin inside the hand grip.
- Runtime uses a 2.6 scale to match the game's stylized equipment.
- Rebuild script: `scripts/create-keris-mpu-gandring.py`; run in Blender Python.
  Set its ROOT to the repository location first. Each run creates a new dedicated scene.

In the game, open the weapon forging menu and craft **Keris Mpu Gandring**:
300 coins, 7 iron, 5 essence. It deals 52 Gaib damage with a 0.42-second attack
cooldown. The existing crafting, inventory and save systems handle ownership.

The synchronous geometry module avoids an empty weapon during loading and is
included in the normal Vite/PWA bundle. The GLB is also included in public assets.
