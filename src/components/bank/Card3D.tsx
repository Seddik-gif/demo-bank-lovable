import { Component, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Card, CardTone } from "@/lib/bank/data";
import { CardFace } from "./CardFace";

/** Card size in scene units: the real card's proportions (85.6 × 54 mm). */
const W = 1.586;
const H = 1;
const DEPTH = 0.04;
const BEVEL = 0.02;

/** The palette from the reference, as solid colours for the printed face. */
const FACE_STOPS: Record<CardTone, [string, string, string]> = {
  violet: ["#e0218a", "#9d2bd6", "#4a14d8"],
  gold: ["#ff8fb1", "#ffc4a3", "#fdf6b2"],
  cyan: ["#9dc3ff", "#bfe6f7", "#b9f6d8"],
  emerald: ["#b9f6d8", "#d8f7a6", "#fdf6b2"],
};

/** Rounded-corner outline of the card, in the same units as the scene. */
function cardShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** The printed face: gradient, network logo, contactless arcs and the number. Drawn once per card. */
function faceTexture(card: Card): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round(1024 / W);
  const g = canvas.getContext("2d");
  if (!g) throw new Error("2D canvas is not available");
  const ink = card.tone === "violet" ? "#ffffff" : "#1e1b4b";

  // Clip to the rounded card, so the corners stay transparent.
  const r = 70;
  g.beginPath();
  g.roundRect(0, 0, canvas.width, canvas.height, r);
  g.clip();

  const [a, b, c] = FACE_STOPS[card.tone];
  const grad = g.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, a);
  grad.addColorStop(0.55, b);
  grad.addColorStop(1, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, canvas.width, canvas.height);

  // Network logo at the top right.
  g.fillStyle = ink;
  g.strokeStyle = ink;
  if (card.network === "Visa") {
    g.font = "italic 900 150px Arial, Helvetica, sans-serif";
    g.textAlign = "right";
    g.fillText("VISA", canvas.width - 70, 190);
  } else {
    g.beginPath();
    g.arc(canvas.width - 210, 160, 80, 0, Math.PI * 2);
    g.fillStyle = "#eb001b";
    g.fill();
    g.beginPath();
    g.arc(canvas.width - 130, 160, 80, 0, Math.PI * 2);
    g.fillStyle = "#f79e1b";
    g.fill();
  }

  // Contactless arcs, to the right of the number.
  g.strokeStyle = ink;
  g.lineWidth = 16;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(canvas.width - 130, 470, 40 + i * 38, -0.7, 0.7);
    g.stroke();
  }

  // The masked number, along the bottom.
  g.fillStyle = ink;
  g.textAlign = "left";
  g.font = "500 74px 'Courier New', monospace";
  g.fillText(`•••• •••• •••• ${card.last4}`, 70, canvas.height - 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The 3D scene: a glass body with the printed face on top, leaning toward the pointer. */
function CardScene({ card, pointer }: { card: Card; pointer: { current: { x: number; y: number } } }) {
  const group = useRef<THREE.Group>(null);
  const shape = useMemo(() => cardShape(W, H, 0.09), []);
  const texture = useMemo(() => faceTexture(card), [card]);

  // The glass body: an extruded rounded slab with a soft bevel.
  const body = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelSize: BEVEL, bevelThickness: BEVEL, bevelSegments: 8, curveSegments: 18 });
    geo.translate(0, 0, -DEPTH / 2);
    return geo;
  }, [shape]);

  // The printed face: the same outline, with UVs that map the whole card onto the texture.
  const face = useMemo(() => {
    const geo = new THREE.ShapeGeometry(shape, 24);
    const pos = geo.attributes["position"];
    if (!pos) return geo;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return geo;
  }, [shape]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // Lean toward the pointer, and settle back when it leaves.
    const ry = pointer.current.x * 0.5;
    const rx = -pointer.current.y * 0.35;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 6, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 6, dt);
  });

  return (
    <group ref={group}>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.85}
          thickness={0.4}
          roughness={0.12}
          ior={1.45}
          iridescence={0.7}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[150, 420]}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh geometry={face} position={[0, 0, DEPTH / 2 + BEVEL + 0.002]}>
        <meshPhysicalMaterial map={texture} roughness={0.22} clearcoat={1} clearcoatRoughness={0.06} transparent alphaTest={0.02} />
      </mesh>
    </group>
  );
}

/** A card drawn in 3D. It leans toward the pointer. */
export function Card3D({ card, className = "" }: { card: Card; className?: string }) {
  const pointer = useRef({ x: 0, y: 0 });
  return (
    <div
      className={`relative aspect-[1.586] w-full ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      }}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
      }}
    >
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 2.6], fov: 34 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.3} />
        <directionalLight position={[-3, -1, 2]} intensity={0.6} color="#c4f1ff" />
        <CardScene card={card} pointer={pointer} />
      </Canvas>
      {card.frozen && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[1.1rem] bg-black/50 text-xs font-semibold uppercase tracking-[0.2em] text-white">Frozen</div>
      )}
    </div>
  );
}

/** Whether this device can draw WebGL. Without it, the flat card is used. */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** If the 3D view fails for any reason, show the flat card instead of breaking the page. */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The card as shown across the app: in 3D where WebGL is available, the flat card elsewhere. */
export function CardVisual({ card, className = "" }: { card: Card; className?: string }) {
  const flat = <CardFace card={card} className={className} />;
  if (!webglAvailable()) return flat;
  return (
    <WebGLBoundary fallback={flat}>
      <Card3D card={card} className={className} />
    </WebGLBoundary>
  );
}
