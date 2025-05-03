import * as THREE from "three";
import "./style.scss";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const canvas = document.querySelector("#experience-canvas");
const renderSection = document.querySelector(".render-section");

const sizes = {
  width: renderSection.clientWidth,
  height: renderSection.clientHeight,
};

const scene = new THREE.Scene();

// 📹 Cámara
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(2.268, 3.304, 4.282);
scene.add(camera);

// 🕹️ Controles
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(-0.676, 0.897, -0.336);
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minAzimuthAngle = -Math.PI / 18;
controls.maxAzimuthAngle = Math.PI / 2;
controls.minDistance = 3;
controls.maxDistance = 6;
controls.update();

// ➡️ Renderizador
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0xffffff);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 🔦 Luces
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(2, 10, -3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(512, 512);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.normalBias = 0.05;
scene.add(directionalLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

// 💡 Lámpara 
let lampLight, lampSphere;
function createLamp() {
  lampLight = new THREE.PointLight(
    0xffaa33, 
    1, 
    0.6, 
    0.7 
  );
  lampLight.position.set(0.47, 2.15, -1.3);
  lampLight.castShadow = true;
  lampSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.15), 
    new THREE.MeshPhongMaterial({
      color: 0xffaa33,
      emissive: 0xffaa33,
      emissiveIntensity: 2, 
      transparent: true,
      opacity: 0.8,
    })
  );
  lampSphere.position.copy(lampLight.position);
}
createLamp();

// 🌑 Sombras
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    shininess: 0,
  })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// 🐉 Loader Draco
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
);
dracoLoader.setDecoderConfig({ type: "js" });

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let model;
let modelLoaded = false;

const clock = new THREE.Clock();
let sillaMovilidad = null;
const maxAngle = Math.PI / 4; 
const oscillationSpeed = 0.3;
let initialY = 0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isHovering = false;
let hoverStartTime = 0; 

// 🌟 Partículas de brillo
const textureLoader = new THREE.TextureLoader();
const sparkleTexture = textureLoader.load("/textures/sparkle2.png");
const sparkleNames = [
  "xonx",
  "pantalla",
  "contact",
  "hojas",
  "maceta",
  "libros",
  "pantalla",
];
const sparkles = [];
let sparklesActive = false;

// 🏠 Cargar modelo
const loadModel = () => {
  if (modelLoaded) return;

  loader.load(
    "/models/room_def.glb",
    (gltf) => {
      model = gltf.scene;
      model.scale.set(1, 1, 1);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse((node) => {
        if (node.isMesh) {
          if (node.material.name === "outline") {
            node.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
            node.castShadow = false;
            node.receiveShadow = false;
          } else {
            node.castShadow = true;
            node.receiveShadow = true;
          }
          node.frustumCulled = true;
          node.matrixAutoUpdate = false;
          node.updateMatrix();
        }
      });

      scene.add(model);

      sillaMovilidad = model.getObjectByName("silla_movilidad");
      if (sillaMovilidad) {
        initialY = sillaMovilidad.rotation.y;
      }

      sparkleNames.forEach((name) => {
        const obj = model.getObjectByName(name);
        if (obj) {
          const pts = createSparkles(obj, {
            count: 80,
            radius: 0.7,
            size: 0.06,
          });
          pts.visible = false; 
          sparkles.push(pts);
        } else {
          console.warn(`No se encontró "${name}" en el modelo`);
        }
      });

      controls.update();
      triggerRenderLoop(); 
      modelLoaded = true;
      const loaderOverlay = document.getElementById("loader-overlay");
      if (loaderOverlay) {
        loaderOverlay.style.opacity = "0";
        setTimeout(() => (loaderOverlay.style.display = "none"), 500); 
      }
    },
    undefined,
    (error) => {
      console.error("Error loading 3D model:", error);
    }
  );
};


const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      loadModel();
      observer.disconnect();
    }
  },
  { threshold: 0.3 }
);

observer.observe(renderSection);

// ↕️ Reajustar pantalla
window.addEventListener("resize", () => {
  sizes.width = renderSection.clientWidth;
  sizes.height = renderSection.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  triggerRenderLoop();
});


let forceRenderFrames = 0;


const triggerRenderLoop = () => {
  forceRenderFrames = 60; 
};

controls.addEventListener("start", triggerRenderLoop);
controls.addEventListener("change", triggerRenderLoop);

controls.addEventListener("start", () => {
  sparklesActive = true;
  sparkles.forEach((p) => (p.visible = true));
  triggerRenderLoop();
});

controls.addEventListener("end", () => {
  sparklesActive = false;
  sparkles.forEach((p) => (p.visible = false));
  triggerRenderLoop();
});


let isVisible = true;
document.addEventListener("visibilitychange", () => {
  isVisible = !document.hidden;
});

const renderLoop = () => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (isVisible && (forceRenderFrames > 0 || isHovering)) {
    if (sillaMovilidad && isHovering) {
      const t = elapsed - hoverStartTime;
      const angle = Math.sin(t * Math.PI * 2 * oscillationSpeed) * maxAngle;
      sillaMovilidad.rotation.y = initialY + angle;
    }

    controls.update();
    renderer.render(scene, camera);
    forceRenderFrames--;
  }

  if (sparklesActive) {
    sparkles.forEach((points) => {
      points.rotation.y += delta * 0.2;
      points.material.opacity = 0.6 + 0.4 * Math.sin(elapsed * 5);
    });
  }

  requestAnimationFrame(renderLoop);
};
renderLoop();

const toggleInput = document.getElementById("theme-toggle");
const body = document.body;

const applyTheme = (theme) => {
  if (theme === "dark") {
    body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
    toggleInput.checked = true;
    renderer.setClearColor(0x1f2937);
    shadowPlane.material.color.set(0x1f2937);
    scene.add(lampLight);
    scene.add(lampSphere);
    ambientLight.intensity = 0.2;
  } else {
    body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
    toggleInput.checked = false;
    renderer.setClearColor(0xffffff); 
    shadowPlane.material.color.set(0xffffff);
    scene.remove(lampLight);
    scene.remove(lampSphere);
    ambientLight.intensity = 1.2;
  }
  triggerRenderLoop();
};

applyTheme(localStorage.getItem("theme") || "light");

toggleInput.addEventListener("change", () => {
  const newTheme = toggleInput.checked ? "dark" : "light";
  applyTheme(newTheme);
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = sillaMovilidad
    ? raycaster.intersectObject(sillaMovilidad, true)
    : [];

  const hoveringNow = intersects.length > 0;
  if (hoveringNow !== isHovering) {
    isHovering = hoveringNow;

    if (isHovering) {
      hoverStartTime = clock.getElapsedTime();
      triggerRenderLoop(); 
    } else {
      triggerRenderLoop(); 
    }
  }
});

function createSparkles(
  targetObject,
  { count = 60, radius = 2, size = 5 } = {}
) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = radius * Math.cbrt(Math.random());
    positions[3 * i + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[3 * i + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[3 * i + 2] = r * Math.cos(phi);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size,
    map: sparkleTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geom, mat);
  points.frustumCulled = true;
  targetObject.add(points);
  return points;
}

const objectOverlayMap = {
  Circle_004001: "academic-overlay",
  Circle_004: "academic-overlay",
  Cube017: "skills-overlay",
  Cube009_4: "skills-overlay",
  Cube009_1: "skills-overlay",
  Cube009_3: "skills-overlay",
  Cube009_5: "skills-overlay",
  Cube_016: "about-overlay",
  lleide: "about-overlay",
  Cube_016001: "about-overlay",
  Cube_016002: "about-overlay",
  Cube_016003: "about-overlay",
  vielha: "about-overlay",
  xonx: "about-overlay",
  Plane196: "projects-overlay",
  Plane197: "projects-overlay",
  Plane197_2: "projects-overlay",
  Mail: "contact-overlay",
};


canvas.addEventListener("click", (event) => {
  if (!model) return;


  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(model, true);

  if (intersects.length > 0) {
    
    const hit = intersects.find((i) => objectOverlayMap[i.object.name]);
    if (hit) {
      const overlayId = objectOverlayMap[hit.object.name];
      document.getElementById(overlayId).classList.remove("hidden");
    }
  }
});