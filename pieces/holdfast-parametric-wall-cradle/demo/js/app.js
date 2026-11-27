// Holdfast Cradle demo page: preset cards, parameter table, checks, file
// list and a three.js STL viewer. Everything is read from data/*.json,
// which tools/build.py writes when it exports the STLs.
import * as THREE from "../vendor/three/three.module.min.js";
import { STLLoader } from "../vendor/three/STLLoader.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

const $ = (s, el = document) => el.querySelector(s);
const el = (tag, attrs = {}, html = "") => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const fmt = (n, d = 1) => Number(n).toFixed(d).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
const MOUNT = { keyhole: "2 keyholes", countersunk: "countersunk", none: "adhesive strips" };
const SHORT = { "power-strip": "Power strip", "upright-router": "Router", "usb-hub": "USB hub", "remote-caddy": "Remotes" };
const DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>';

const [presets, params] = await Promise.all([
  fetch("data/presets.json").then((r) => r.json()),
  fetch("data/parameters.json").then((r) => r.json()),
]);
const sizes = Object.fromEntries(presets.map((p) => [p.id, p.stl_bytes]));
const kb = (b) => (b ? `${Math.round(b / 1024)} KB` : "");
const mountLabel = (p) => {
  const s = p.params.mount_style;
  if (s === "none") return MOUNT.none;
  return `${p.params.screw_count} ${s === "keyhole" ? "keyhole" : "countersunk"}${p.params.screw_count > 1 ? "s" : ""}`;
};
const dimText = (p) => `${fmt(p.outer_mm[0])} × ${fmt(p.outer_mm[1])} × ${fmt(p.outer_mm[2])} mm`;

/* ---------------------------------------------------------------- viewer */
const stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 4 / 3, 1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.62;

scene.add(new THREE.HemisphereLight(0xfff4e6, 0x30363b, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0005;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd3e0, 0.9);
scene.add(rim);

// Everything model-related lives in `model` in OpenSCAD coordinates (Z up,
// wall at y = 0, front toward +y). `world` turns that into three.js
// coordinates (Y up) with the front of the cradle facing the camera.
const world = new THREE.Group();
world.rotation.set(-Math.PI / 2, 0, Math.PI);
scene.add(world);
const model = new THREE.Group();
world.add(model);

const petg = new THREE.MeshStandardMaterial({ color: 0xd9773a, roughness: 0.48, metalness: 0.02 });
const xray = new THREE.MeshStandardMaterial({ color: 0xd9773a, roughness: 0.5, transparent: true, opacity: 0.28, depthWrite: false });
const edgeMat = new THREE.LineBasicMaterial({ color: 0xffc79b, transparent: true, opacity: 0.85 });
const deviceMat = new THREE.MeshStandardMaterial({ color: 0xa9c6d6, transparent: true, opacity: 0.16, roughness: 0.3, depthWrite: false });
const deviceEdge = new THREE.LineBasicMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0.55 });

let mesh, edges, device, wall, bed, current;
const state = { device: true, wall: false, xray: false, spin: false };
const loader = new STLLoader();
const cache = {};

function fitCamera(p, keepAngle = false) {
  const [w, d, h] = p.outer_mm;
  const devH = state.device ? p.params.floor_thickness + p.params.device_height : 0;
  const H = Math.max(h, devH);
  const target = new THREE.Vector3(0, H * 0.42, 0);
  const radius = Math.max(w, H * 1.35, d * 2) * 0.5;
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const dist = radius / Math.tan(Math.min(vHalf, hHalf)) * 1.12;
  const dir = keepAngle
    ? camera.position.clone().sub(controls.target).normalize()
    : new THREE.Vector3(-0.55, 0.52, 1).normalize();
  controls.target.copy(target);
  camera.position.copy(target).add(dir.multiplyScalar(dist));
  camera.near = dist / 50;
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.minDistance = dist * 0.35;
  controls.maxDistance = dist * 3;
  const s = Math.max(w, H) * 1.6;
  key.position.set(-s * 0.6, s * 1.2, s);
  key.shadow.camera.left = key.shadow.camera.bottom = -s;
  key.shadow.camera.right = key.shadow.camera.top = s;
  key.shadow.camera.far = s * 4;
  key.shadow.camera.updateProjectionMatrix();
  rim.position.set(s, s * 0.4, -s);
}

function buildSurroundings(p) {
  const [w, d] = p.outer_mm;
  for (const o of [device, wall, bed]) if (o) model.remove(o);
  // the device, as a see-through box
  const { wall: wt, clearance: c, back_thickness: bt, floor_thickness: ft, device_width: dw, device_depth: dd, device_height: dh } = p.params;
  device = new THREE.Group();
  const box = new THREE.BoxGeometry(dw, dd, dh);
  box.translate(wt + c + dw / 2, bt + c + dd / 2, ft + dh / 2 + 0.05);
  device.add(new THREE.Mesh(box, deviceMat), new THREE.LineSegments(new THREE.EdgesGeometry(box), deviceEdge));
  device.visible = state.device;
  // a plaster wall behind it
  const wallSize = Math.max(w, p.outer_mm[2]) * 10;
  wall = new THREE.Mesh(new THREE.PlaneGeometry(wallSize, wallSize), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.95 }));
  wall.rotation.x = -Math.PI / 2; // facing the front (+y), toward the camera
  wall.position.set(w / 2, -0.2, p.outer_mm[2] / 2);
  wall.receiveShadow = true;
  wall.visible = state.wall;
  // a print bed with a 10 mm grid, when it isn't on the wall
  const bedSize = Math.ceil(Math.max(w, d) * 1.5 / 10) * 10 + 20;
  bed = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(bedSize, bedSize), new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.8 }));
  plate.receiveShadow = true;
  const grid = new THREE.GridHelper(bedSize, bedSize / 10, 0x4a5157, 0x353a3f);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = 0.05;
  bed.add(plate, grid);
  bed.position.set(w / 2, d / 2, -0.15);
  bed.visible = !state.wall;
  model.add(device, wall, bed);
}

async function show(id, { scroll = false } = {}) {
  const p = presets.find((x) => x.id === id);
  current = p;
  document.querySelectorAll("#viewer-tabs .tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.id === id));
  document.querySelectorAll(".preset").forEach((c) => c.classList.toggle("is-active", c.dataset.id === id));
  $("#viewer-dl").href = p.stl;
  $("#viewer-dl span").textContent = `STL · ${kb(sizes[p.id])}`;
  $("#viewer-note").innerHTML = `<b>${p.title}.</b> ${p.blurb}`;
  $("#dims").innerHTML = `<b>${dimText(p)}</b><br>${p.check.triangles.toLocaleString()} triangles · ${mountLabel(p)}`;
  $("#loading").style.opacity = 1;
  if (scroll) $("#viewer").scrollIntoView({ behavior: "smooth", block: "center" });
  const geo = cache[id] || (cache[id] = await loader.loadAsync(p.stl));
  if (current !== p) return;
  if (mesh) { model.remove(mesh); model.remove(edges); }
  geo.computeVertexNormals();
  mesh = new THREE.Mesh(geo, state.xray ? xray : petg);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
  edges.visible = state.xray;
  model.add(mesh, edges);
  model.position.set(-p.outer_mm[0] / 2, -p.outer_mm[1] / 2, 0);
  buildSurroundings(p);
  fitCamera(p);
  $("#loading").style.opacity = 0;
}

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(() => { resize(); if (current) fitCamera(current, true); }).observe(stage);
resize();

let inView = true;
new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(stage);
renderer.setAnimationLoop(() => {
  if (!inView) return;
  if (state.spin) world.rotation.z += 0.004;
  controls.update();
  renderer.render(scene, camera);
});

function toggle(btn, keyName, apply) {
  btn.addEventListener("click", () => {
    state[keyName] = !state[keyName];
    btn.setAttribute("aria-pressed", state[keyName]);
    apply();
  });
}
toggle($("#t-device"), "device", () => { if (device) device.visible = state.device; if (current) fitCamera(current, true); });
toggle($("#t-wall"), "wall", () => {
  if (wall) wall.visible = state.wall;
  if (bed) bed.visible = !state.wall;
  if (state.wall && state.spin) $("#t-spin").click();
  if (state.wall) world.rotation.z = Math.PI;
});
toggle($("#t-xray"), "xray", () => { if (mesh) { mesh.material = state.xray ? xray : petg; edges.visible = state.xray; } });
toggle($("#t-spin"), "spin", () => { if (state.spin && state.wall) $("#t-wall").click(); if (!state.spin) world.rotation.z = Math.PI; });

/* -------------------------------------------------------------- tabs, cards */
const tabs = $("#viewer-tabs");
const cards = $("#preset-cards");
presets.forEach((p, i) => {
  const t = el("button", { class: "tab", role: "tab", "data-id": p.id, "aria-selected": "false" }, p.title);
  t.addEventListener("click", () => show(p.id));
  tabs.append(t);

  const card = el("article", { class: "preset", "data-id": p.id });
  card.innerHTML = `
    <figure>
      <img src="renders/web/holdfast-${p.id}-hero.webp" width="1200" height="900" loading="lazy" alt="OpenSCAD render of the ${p.title.toLowerCase()} preset">
      <span class="num">0${i + 1}</span>
      <div class="views" role="group" aria-label="Render view">
        ${["hero", "fit", "back", "side"].map((v, j) => `<button aria-pressed="${j === 0}" data-v="${v}">${{ hero: "3/4", fit: "fit", back: "back", side: "side" }[v]}</button>`).join("")}
      </div>
    </figure>
    <div class="body">
      <h3>${p.title}</h3>
      <div class="sz">${dimText(p)}</div>
      <p>${p.blurb}</p>
      <dl>
        <dt>Holds</dt><dd>${fmt(p.params.device_width, 0)} × ${fmt(p.params.device_depth, 0)} mm</dd>
        <dt>Mount</dt><dd>${mountLabel(p)}</dd>
        <dt>Solid volume</dt><dd>${fmt(p.check.volume_cm3)} cm³</dd>
      </dl>
      <div class="acts">
        <button class="btn solid" data-act="view">View in 3D</button>
        <a class="btn" href="${p.stl}" download>${DL}STL</a>
      </div>
    </div>`;
  const img = $("img", card);
  const altFor = {
    hero: `OpenSCAD render of the ${p.title.toLowerCase()} preset, from the front left`,
    fit: `The ${p.title.toLowerCase()} preset with the device shown as a see-through box`,
    back: `The wall side of the ${p.title.toLowerCase()} preset, showing the mounting`,
    side: `Side view of the ${p.title.toLowerCase()} preset, showing the sloped profile`,
  };
  card.querySelectorAll(".views button").forEach((b) => b.addEventListener("click", () => {
    card.querySelectorAll(".views button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    img.src = `renders/web/holdfast-${p.id}-${b.dataset.v}.webp`;
    img.alt = altFor[b.dataset.v];
  }));
  $('[data-act="view"]', card).addEventListener("click", () => show(p.id, { scroll: true }));
  cards.append(card);
});

/* --------------------------------------------------------- parameter table */
const tbody = $("#param-table tbody");
const sections = [...new Set(params.map((p) => p.section))];
const showVal = (p, v) => {
  if (p.name === "hole_height" && v === 0) return "auto";
  if (p.type === "boolean") return v ? "yes" : "no";
  if (p.type === "text" || p.type === "choice") return v === "" ? "(none)" : v;
  return fmt(v, 2) + (p.unit ? ` ${p.unit}` : "");
};
const showRange = (p) => {
  if (p.range) return `${fmt(p.range.min, 2)} to ${fmt(p.range.max, 2)}, step ${fmt(p.range.step, 2)}`;
  if (p.options) return p.options.join(" / ");
  if (p.type === "boolean") return "yes / no";
  return "any text";
};
function renderTable(filter) {
  tbody.innerHTML = "";
  for (const s of sections) {
    if (filter !== "All" && filter !== s) continue;
    tbody.append(el("tr", { class: "sec" }, `<td colspan="8">${s}</td>`));
    for (const p of params.filter((x) => x.section === s)) {
      const tr = el("tr", { class: "row" });
      tr.innerHTML = `<td class="p"><code>${p.name}</code></td><td class="d">${p.description}</td>` +
        `<td class="v" data-label="Default">${showVal(p, p.default)}</td><td class="r" data-label="Range">${showRange(p)}</td>` +
        presets.map((pr) => {
          const v = p.presets[pr.id];
          return `<td class="v${v !== p.default ? " changed" : ""}" data-label="${SHORT[pr.id]}">${showVal(p, v)}</td>`;
        }).join("");
      tbody.append(tr);
    }
  }
}
const chips = $("#param-chips");
["All", ...sections].forEach((s, i) => {
  const c = el("button", { class: "chip", "aria-pressed": i === 0 }, s);
  c.addEventListener("click", () => {
    chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    renderTable(s);
  });
  chips.append(c);
});
renderTable("All");

/* ------------------------------------------------------------ checks, beds */
$("#qa-table").innerHTML = `<thead><tr><th>Preset</th><th class="num">Triangles</th><th class="num">Volume</th><th class="num">Bed contact</th><th>Mesh</th></tr></thead><tbody>` +
  presets.map((p) => `<tr><td>${SHORT[p.id]}</td><td class="num">${p.check.triangles.toLocaleString()}</td><td class="num">${fmt(p.check.volume_cm3)} cm³</td><td class="num">${fmt(p.check.bed_contact_cm2)} cm²</td><td>${p.check.watertight ? '<span class="pass">watertight</span>' : "open"}</td></tr>`).join("") + "</tbody>";

const BEDS = [["180 × 180", 180, 180], ["220 × 220", 220, 220], ["256 × 256", 256, 256], ["300 × 300", 300, 300]];
const fits = ([w, d], bw, bd) => {
  if ((w <= bw && d <= bd) || (w <= bd && d <= bw)) return "yes";
  if ((w + d) / Math.SQRT2 <= Math.min(bw, bd)) return "diagonal";
  return "no";
};
$("#bed-table").innerHTML = `<thead><tr><th>Preset</th>${BEDS.map((b) => `<th>${b[0]} mm</th>`).join("")}</tr></thead><tbody>` +
  presets.map((p) => `<tr><td>${SHORT[p.id]}</td>${BEDS.map((b) => {
    const f = fits(p.outer_mm, b[1], b[2]);
    const color = f === "yes" ? "var(--ok)" : f === "diagonal" ? "var(--petg-deep)" : "var(--muted)";
    return `<td style="color:${color};font-weight:600">${f}</td>`;
  }).join("")}</tr>`).join("") + "</tbody>";

/* ------------------------------------------------------------------- files */
const files = [
  { href: "cad/holdfast-cradle.scad", ext: "scad", name: "holdfast-cradle.scad", note: "The model, with the Customizer settings at the top" },
  { href: "cad/holdfast-cradle.json", ext: "json", name: "holdfast-cradle.json", note: "The four presets as Customizer parameter sets" },
  ...presets.map((p) => ({ href: p.stl, ext: "stl", name: p.stl.split("/").pop(), note: `${p.title}, ${dimText(p)}`, size: sizes[p.id] })),
];
const fl = $("#file-list");
for (const f of files) {
  const li = el("li");
  li.innerHTML = `<a href="${f.href}" download><span class="ext ${f.ext}">.${f.ext.toUpperCase()}</span><span><b>${f.name}</b><small>${f.note}</small></span><span class="size">${kb(f.size)}</span></a>`;
  fl.append(li);
}

const start = new URLSearchParams(location.search).get("preset");
show(presets.some((p) => p.id === start) ? start : "upright-router");
