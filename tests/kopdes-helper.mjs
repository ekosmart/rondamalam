export async function purchaseAtKopdes(page, type, id) {
  return page.evaluate(
    ({ type, id }) => {
      const g = __ronda,
        k = g.kopdes;
      g.ui.close();
      Object.assign(g.state.data, { x: 74, z: -16 });
      g.altitude = 0;
      if (!k.enter()) throw new Error("Cannot enter Kopdes");
      const e = k.entries.find((e) => e.type === type && e.def.id === id);
      k.position.set(e.x, 0, e.z + (type === "mount" ? 3.6 : 1.8));
      g.cameraYaw = 0;
      g.action("interact");
      g.action(type === "mount" ? "buy-mount" : "frontier-buy", { id });
      k.leave();
    },
    { type, id },
  );
}
