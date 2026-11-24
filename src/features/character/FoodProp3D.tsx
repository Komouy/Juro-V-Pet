import React, { useMemo, useEffect } from "react";
import * as THREE from "three";

interface FoodProp3DProps {
  foodId?: string;
}

// Sculpted glossy 3D Heart component for Juro's satisfied post-meal pop!
export const HeartPop3D: React.FC = React.memo(() => {
  const heartGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.09);
    shape.bezierCurveTo(0.11, -0.02, 0.14, 0.08, 0.07, 0.11);
    shape.bezierCurveTo(0.03, 0.125, 0, 0.095, 0, 0.07);
    shape.bezierCurveTo(0, 0.095, -0.03, 0.125, -0.07, 0.11);
    shape.bezierCurveTo(-0.14, 0.08, -0.11, -0.02, 0, -0.09);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.022,
      bevelThickness: 0.022,
    });
    geo.center();
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      heartGeo.dispose();
    };
  }, [heartGeo]);

  return (
    <mesh geometry={heartGeo}>
      <meshStandardMaterial
        color="#F43F5E"
        roughness={0.14}
        metalness={0.08}
        emissive="#FB7185"
        emissiveIntensity={0.35}
      />
    </mesh>
  );
});

export const FoodProp3D: React.FC<FoodProp3DProps> = React.memo(({ foodId = "orange-slice" }) => {
  // Radial orange slice segment dividers (5 crisp white pith membranes)
  const orangeDividers = useMemo(
    () => [-0.95, -0.48, 0, 0.48, 0.95],
    []
  );

  // Cute glossy honey jar body & honey drips
  if (foodId === "honey-drop") {
    return (
      <group rotation={[0.18, 0.25, -0.12]} scale={1.15}>
        {/* Rounded Glossy Honey Pot Base */}
        <mesh position={[0, -0.03, 0]} scale={[1.05, 0.96, 1.05]}>
          <sphereGeometry args={[0.145, 16, 14]} />
          <meshStandardMaterial
            color="#F59E0B"
            roughness={0.1}
            metalness={0.08}
            emissive="#D97706"
            emissiveIntensity={0.22}
          />
        </mesh>
        {/* Inner Golden Glow Highlight */}
        <mesh position={[-0.045, 0.01, 0.1]} scale={[0.45, 0.72, 0.35]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshBasicMaterial color="#FEF3C7" transparent opacity={0.65} />
        </mesh>

        {/* Cream Paper Label Wrap */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.151, 0.151, 0.075, 16, 1, true]} />
          <meshStandardMaterial color="#FFFBEB" roughness={0.65} side={THREE.DoubleSide} />
        </mesh>
        {/* Amber Honeycomb Emblem on Front Label */}
        <mesh position={[0, -0.04, 0.153]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.028, 0.028, 0.006, 6]} />
          <meshBasicMaterial color="#D97706" />
        </mesh>

        {/* Jar Neck & Rustic Wooden Rim */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.095, 0.11, 0.05, 14]} />
          <meshStandardMaterial color="#B45309" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.135, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.098, 0.018, 8, 16]} />
          <meshStandardMaterial color="#92400E" roughness={0.5} />
        </mesh>

        {/* Glossy Thick Honey Pool on Top */}
        <mesh position={[0, 0.138, 0]}>
          <cylinderGeometry args={[0.086, 0.086, 0.018, 14]} />
          <meshStandardMaterial
            color="#FBBF24"
            roughness={0.08}
            metalness={0.08}
            emissive="#F59E0B"
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Sculpted Thick Honey Drips Oozing Over Rim */}
        <group>
          <mesh position={[0.06, 0.085, 0.095]}>
            <capsuleGeometry args={[0.017, 0.065, 5, 8]} />
            <meshStandardMaterial color="#FBBF24" roughness={0.08} metalness={0.06} />
          </mesh>
          <mesh position={[-0.04, 0.095, 0.1]}>
            <capsuleGeometry args={[0.014, 0.045, 5, 8]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.08} metalness={0.06} />
          </mesh>
          <mesh position={[0.01, 0.105, 0.106]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshStandardMaterial color="#FDE047" roughness={0.08} metalness={0.06} />
          </mesh>
        </group>

        {/* Miniature Wooden Honey Dipper Stick Sticking Out */}
        <group position={[0.03, 0.19, -0.01]} rotation={[0.15, 0, -0.42]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.011, 0.013, 0.22, 8]} />
            <meshStandardMaterial color="#D97706" roughness={0.7} />
          </mesh>
          {/* Classic Grooved Honey Dipper Rings */}
          {[-0.025, 0, 0.025].map((yOff, idx) => (
            <mesh key={idx} position={[0, 0.145 + yOff, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.024, 0.0085, 8, 12]} />
              <meshStandardMaterial color="#B45309" roughness={0.55} />
            </mesh>
          ))}
          {/* Glistening Honey Drop on Dipper Tip */}
          <mesh position={[0.012, 0.135, 0.02]} scale={[0.85, 1.25, 0.85]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial
              color="#FDE047"
              roughness={0.08}
              metalness={0.06}
              emissive="#F59E0B"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      </group>
    );
  }

  // Fresh Melon Jelly Cubes Stacked on a Miniature Porcelain Saucer with Mint Leaves
  if (foodId === "melon-cubes") {
    return (
      <group rotation={[0.38, 0.35, 0.05]} scale={1.12}>
        {/* Glossy White Mini Porcelain Dessert Plate */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.24, 0.17, 0.028, 20]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.14} metalness={0.06} />
        </mesh>
        <mesh position={[0, -0.088, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.23, 0.012, 8, 20]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.25} />
        </mesh>

        {/* Left Melon Cube (with layered rind & juicy mint flesh) */}
        <group position={[-0.075, -0.025, 0.03]} rotation={[0, 0.25, 0]}>
          <mesh position={[0, -0.048, 0]}>
            <boxGeometry args={[0.115, 0.018, 0.115]} />
            <meshStandardMaterial color="#047857" roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.032, 0]}>
            <boxGeometry args={[0.115, 0.016, 0.115]} />
            <meshStandardMaterial color="#A7F3D0" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.115, 0.085, 0.115]} />
            <meshStandardMaterial
              color="#10B981"
              roughness={0.1}
              metalness={0.05}
              emissive="#059669"
              emissiveIntensity={0.15}
            />
          </mesh>
        </group>

        {/* Right Melon Cube */}
        <group position={[0.078, -0.025, -0.02]} rotation={[0, -0.35, 0]}>
          <mesh position={[0, -0.048, 0]}>
            <boxGeometry args={[0.115, 0.018, 0.115]} />
            <meshStandardMaterial color="#047857" roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.032, 0]}>
            <boxGeometry args={[0.115, 0.016, 0.115]} />
            <meshStandardMaterial color="#A7F3D0" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.115, 0.085, 0.115]} />
            <meshStandardMaterial
              color="#34D399"
              roughness={0.1}
              metalness={0.05}
              emissive="#10B981"
              emissiveIntensity={0.18}
            />
          </mesh>
        </group>

        {/* Top Stacked Juicy Melon Cube */}
        <group position={[0.0, 0.082, 0.0]} rotation={[0.08, 0.55, -0.05]}>
          <mesh position={[0, -0.042, 0]}>
            <boxGeometry args={[0.11, 0.016, 0.11]} />
            <meshStandardMaterial color="#A7F3D0" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.008, 0]}>
            <boxGeometry args={[0.11, 0.088, 0.11]} />
            <meshStandardMaterial
              color="#10B981"
              roughness={0.08}
              metalness={0.05}
              emissive="#34D399"
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Glistening Dew Drop on Top */}
          <mesh position={[-0.025, 0.058, 0.025]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshBasicMaterial color="#ECFDF5" />
          </mesh>
        </group>

        {/* Cute Cocktail Skewer Pick */}
        <group position={[0.01, 0.18, 0]} rotation={[0.1, 0, -0.2]}>
          <mesh>
            <cylinderGeometry args={[0.006, 0.006, 0.16, 6]} />
            <meshStandardMaterial color="#E7CBA9" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.085, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#F43F5E" roughness={0.25} />
          </mesh>
        </group>

        {/* 2 Crisp Fresh Mint Leaves Garnish */}
        <mesh position={[-0.1, 0.08, 0.06]} rotation={[0.3, 0.4, 0.65]} scale={[1.35, 0.25, 0.75]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial color="#16A34A" roughness={0.5} />
        </mesh>
        <mesh position={[-0.065, 0.105, 0.075]} rotation={[0.2, -0.3, 0.35]} scale={[1.2, 0.25, 0.68]}>
          <sphereGeometry args={[0.036, 8, 8]} />
          <meshStandardMaterial color="#22C55E" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Crisp Golden Waffle Biscuit ("Biskuit Gandum")
  if (foodId === "biscuit") {
    return (
      <group rotation={[0.45, 0.28, -0.15]} scale={1.15}>
        {/* Golden Baked Biscuit Base */}
        <mesh>
          <boxGeometry args={[0.28, 0.065, 0.28]} />
          <meshStandardMaterial color="#D97706" roughness={0.62} />
        </mesh>
        {/* Toasted Outer Rim */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.25, 0.055, 0.25]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.55} />
        </mesh>
        {/* Waffle Grid Squares */}
        {[-0.06, 0.06].map((xOff, xi) =>
          [-0.06, 0.06].map((zOff, zi) => (
            <mesh key={`${xi}-${zi}`} position={[xOff, 0.042, zOff]}>
              <boxGeometry args={[0.085, 0.015, 0.085]} />
              <meshStandardMaterial color="#FBBF24" roughness={0.45} />
            </mesh>
          ))
        )}
        {/* Melting Cream Butter Pat on Center */}
        <mesh position={[0, 0.056, 0]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.075, 0.025, 0.075]} />
          <meshStandardMaterial color="#FEF9C3" roughness={0.18} metalness={0.05} />
        </mesh>
      </group>
    );
  }

  // Cozy Ceramic Mug of Warm Milk ("Susu Hangat Murni")
  if (foodId === "warm-milk") {
    return (
      <group rotation={[0.22, -0.25, 0.08]} scale={1.12}>
        {/* Ceramic Mug Body */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.135, 0.125, 0.24, 18]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.14} metalness={0.08} />
        </mesh>
        {/* Warm Orange Accent Band on Mug */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.137, 0.131, 0.06, 18, 1, true]} />
          <meshStandardMaterial color="#F97316" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Mug Handle */}
        <mesh position={[0.14, -0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.065, 0.018, 8, 14, Math.PI]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.14} metalness={0.08} />
        </mesh>
        {/* Creamy Milk Surface */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.118, 0.118, 0.02, 16]} />
          <meshStandardMaterial
            color="#FFFBEB"
            roughness={0.1}
            metalness={0.04}
            emissive="#FEF3C7"
            emissiveIntensity={0.15}
          />
        </mesh>
        {/* Cozy Rising Steam Puffs */}
        <mesh position={[-0.03, 0.16, 0]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.65} />
        </mesh>
        <mesh position={[0.035, 0.21, 0.01]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  // Default: Detailed Juicy Sweet Orange Wedge ("Irisan Jeruk Manis")
  return (
    <group rotation={[0.52, 0.22, -0.25]} scale={1.15}>
      {/* Outer Textured Tangerine Peel */}
      <mesh position={[0, -0.018, 0]}>
        <cylinderGeometry args={[0.215, 0.215, 0.078, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color="#EA580C"
          roughness={0.28}
          metalness={0.04}
          emissive="#C2410C"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Creamy White Inner Pith Rim */}
      <mesh position={[0, -0.006, 0]}>
        <cylinderGeometry args={[0.194, 0.194, 0.082, 20, 1, false, 0.03, Math.PI - 0.06]} />
        <meshStandardMaterial color="#FFF7ED" roughness={0.45} />
      </mesh>

      {/* Juicy Glossy Citrus Pulp */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.174, 0.174, 0.086, 20, 1, false, 0.06, Math.PI - 0.12]} />
        <meshStandardMaterial
          color="#F97316"
          roughness={0.1}
          metalness={0.06}
          emissive="#FB923C"
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Center White Pith Hub */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.09, 10]} />
        <meshStandardMaterial color="#FFF7ED" roughness={0.4} />
      </mesh>

      {/* 5 Crisp Radial White Citrus Segment Membranes */}
      {orangeDividers.map((angle, idx) => (
        <mesh
          key={idx}
          position={[Math.sin(angle) * 0.09, 0.002, Math.cos(angle) * 0.09]}
          rotation={[0, angle, 0]}
        >
          <boxGeometry args={[0.009, 0.088, 0.175]} />
          <meshStandardMaterial color="#FFEDD5" roughness={0.35} />
        </mesh>
      ))}

      {/* Cute Glistening Citrus Seeds & Pulp Shine Beads */}
      <mesh position={[-0.045, 0.046, 0.065]} rotation={[0, 0.4, 0]} scale={[0.7, 0.45, 1.3]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#FEF3C7" roughness={0.2} />
      </mesh>
      <mesh position={[0.052, 0.046, 0.062]} rotation={[0, -0.35, 0]} scale={[0.7, 0.45, 1.3]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#FEF3C7" roughness={0.2} />
      </mesh>

      {/* Tiny Fresh Citrus Leaf on Corner of Peel */}
      <mesh position={[0.175, 0.03, -0.02]} rotation={[0.3, -0.2, -0.55]} scale={[1.45, 0.25, 0.72]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#16A34A" roughness={0.45} />
      </mesh>
    </group>
  );
});
