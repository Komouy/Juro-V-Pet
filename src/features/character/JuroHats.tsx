import React from "react";
import * as THREE from "three";

interface JuroHeadwearProps {
  activeHat: string | null | undefined;
  level: number;
  leafUmbrellaRef: React.RefObject<THREE.Group | null>;
  crownRef: React.RefObject<THREE.Group | null>;
  propellerRef: React.RefObject<THREE.Group | null>;
}

export const JuroHeadwear: React.FC<JuroHeadwearProps> = React.memo(
  ({ activeHat, level, leafUmbrellaRef, crownRef, propellerRef }) => {
    return (
      <>
        {/* === 3D COZY LEAF PARASOL / UMBRELLA (Worn during Pixel Rain) === */}
        <group
          ref={leafUmbrellaRef}
          visible={false}
          position={[0.22, 0.52, 0.08]}
        >
          {/* Stem reaching up from right flank */}
          <group position={[-0.04, -0.16, 0.02]} rotation={[0.12, 0, -0.28]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.024, 0.028, 0.36, 7]} />
              <meshLambertMaterial color="#15803D" />
            </mesh>
            <mesh position={[0.04, 0.38, 0.02]} rotation={[0, 0, 0.36]}>
              <cylinderGeometry args={[0.018, 0.024, 0.24, 7]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
          </group>

          {/* Broad organic leaf canopy sheltering Juro's head */}
          <group position={[0.04, 0.46, 0.05]} rotation={[0.22, 0.12, -0.22]}>
            <mesh scale={[1.45, 0.14, 1.7]}>
              <sphereGeometry args={[0.36, 14, 10]} />
              <meshStandardMaterial color="#22C55E" roughness={0.28} metalness={0.06} />
            </mesh>
            <mesh scale={[1.5, 0.06, 1.76]}>
              <sphereGeometry args={[0.355, 14, 10]} />
              <meshBasicMaterial color="#16A34A" />
            </mesh>
            <mesh position={[0, 0.022, 0]} scale={[0.038, 0.038, 0.88]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#15803D" />
            </mesh>
            <mesh position={[-0.15, 0.018, -0.06]} rotation={[0, 0.65, 0]} scale={[0.26, 0.024, 0.02]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
            <mesh position={[0.15, 0.018, -0.06]} rotation={[0, -0.65, 0]} scale={[0.26, 0.024, 0.02]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
            <mesh position={[0, 0.035, 0.5]}>
              <sphereGeometry args={[0.042, 8, 8]} />
              <meshStandardMaterial
                color="#E0F2FE"
                roughness={0.05}
                metalness={0.2}
                transparent
                opacity={0.88}
                emissive="#BAE6FD"
                emissiveIntensity={0.25}
              />
            </mesh>
          </group>
        </group>

        {/* === MINI NOBLE GOLDEN CROWN (Evolution Stage 3: Juro Mulia, Lv. 10+) === */}
        <group
          ref={crownRef}
          visible={level >= 10}
          position={[0, 0.86, 0.04]}
          rotation={[-0.05, 0, 0]}
        >
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.25, 0.08, 12]} />
            <meshStandardMaterial color="#CA8A04" roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.27, 0.22, 0.09, 12]} />
            <meshStandardMaterial color="#FACC15" roughness={0.25} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.16, 0.22]} rotation={[0.15, 0, 0]}>
            <coneGeometry args={[0.07, 0.14, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[-0.18, 0.15, 0.08]} rotation={[0.1, 0, 0.2]}>
            <coneGeometry args={[0.06, 0.12, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[0.18, 0.15, 0.08]} rotation={[0.1, 0, -0.2]}>
            <coneGeometry args={[0.06, 0.12, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.06, 0.24]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color="#EF4444" roughness={0.15} metalness={0.4} />
          </mesh>
        </group>

        {/* === 3D WEARABLE HATS === */}
        {/* 1. Topi Baling-baling (hat-propeller) */}
        {activeHat === "hat-propeller" && (
          <group position={[0, 0.77, 0.03]} rotation={[-0.06, 0, 0]}>
            <mesh position={[0, 0, 0]} scale={[1.22, 0.72, 1.16]}>
              <sphereGeometry args={[0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#DC2626" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.003, 0]} scale={[1.224, 0.724, 1.164]}>
              <sphereGeometry args={[0.62, 16, 12, 0, Math.PI * 0.52, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#16A34A" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.003, 0]} scale={[1.224, 0.724, 1.164]}>
              <sphereGeometry args={[0.62, 16, 12, Math.PI * 0.95, Math.PI * 0.55, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#EAB308" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.02, 0.52]} rotation={[0.22, 0, 0]}>
              <boxGeometry args={[0.82, 0.035, 0.44]} />
              <meshStandardMaterial color="#2563EB" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color="#1D4ED8" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#FACC15" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.63, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} />
              <meshStandardMaterial color="#18181B" roughness={0.3} metalness={0.7} />
            </mesh>
            <group ref={propellerRef} position={[0, 0.70, 0]}>
              <mesh>
                <sphereGeometry args={[0.065, 12, 12]} />
                <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.8} />
              </mesh>
              <mesh position={[0.34, 0.008, 0]} rotation={[0, 0, 0.08]}>
                <boxGeometry args={[0.62, 0.025, 0.11]} />
                <meshStandardMaterial color="#18181B" roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh position={[-0.34, -0.008, 0]} rotation={[0, 0, -0.08]}>
                <boxGeometry args={[0.62, 0.025, 0.11]} />
                <meshStandardMaterial color="#18181B" roughness={0.3} metalness={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* 2. Topi Koki (hat-chef) */}
        {activeHat === "hat-chef" && (
          <group position={[0, 0.76, 0.02]} rotation={[-0.05, 0, 0]}>
            <mesh position={[0, 0.10, 0]} scale={[1.16, 1.0, 1.08]}>
              <cylinderGeometry args={[0.62, 0.66, 0.20, 24]} />
              <meshStandardMaterial color="#F1F5F9" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.38, 0]} scale={[1.36, 0.85, 1.30]}>
              <sphereGeometry args={[0.58, 20, 16]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[0.36, 0.46, 0.12]} scale={[0.9, 0.8, 0.9]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[-0.36, 0.46, 0.12]} scale={[0.9, 0.8, 0.9]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.50, 0.34]} scale={[0.9, 0.8, 0.9]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.48, -0.30]} scale={[0.9, 0.8, 0.9]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
          </group>
        )}

        {/* 3. Topi Jerami (hat-straw) */}
        {activeHat === "hat-straw" && (
          <group position={[0, 0.78, 0.02]} rotation={[-0.06, 0, -0.04]}>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.63, 1.10, 28]} />
              <meshStandardMaterial color="#E6D5AC" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.08, 0.024, 10, 28]} />
              <meshStandardMaterial color="#D4B982" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.64, 0.66, 0.30, 24]} />
              <meshStandardMaterial color="#D4B982" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.30, 0]}>
              <cylinderGeometry args={[0.64, 0.64, 0.015, 24]} />
              <meshStandardMaterial color="#E6D5AC" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.66, 0.67, 0.10, 24]} />
              <meshStandardMaterial color="#18181B" roughness={0.5} />
            </mesh>
            <group position={[0.66, 0.06, 0.16]} rotation={[0, 0.3, 0]}>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.06, 0.07, 0.06]} />
                <meshStandardMaterial color="#18181B" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.04, 0.07]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.04, 0.08, 0.04]} />
                <meshStandardMaterial color="#27272A" roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.04, 0.07]} rotation={[-0.4, 0, 0]}>
                <boxGeometry args={[0.04, 0.08, 0.04]} />
                <meshStandardMaterial color="#27272A" roughness={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* 4. Topi Pesulap (hat-top) */}
        {activeHat === "hat-top" && (
          <group position={[0, 0.78, 0.02]} rotation={[-0.06, 0, 0.04]}>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.60, 1.02, 28]} />
              <meshStandardMaterial color="#18181B" roughness={0.4} metalness={0.15} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.00, 0.022, 10, 28]} />
              <meshStandardMaterial color="#18181B" roughness={0.4} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.68, 0.62, 0.76, 24]} />
              <meshStandardMaterial color="#242428" roughness={0.35} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.765, 0]}>
              <cylinderGeometry args={[0.68, 0.68, 0.015, 24]} />
              <meshStandardMaterial color="#18181B" roughness={0.4} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.635, 0.625, 0.14, 24]} />
              <meshStandardMaterial color="#DC2626" roughness={0.25} metalness={0.35} />
            </mesh>
          </group>
        )}

        {/* 5. Topi Pesta (hat-party) */}
        {activeHat === "hat-party" && (
          <group position={[0.02, 0.82, 0.02]} rotation={[-0.08, 0.08, -0.10]}>
            <mesh position={[0, 0.45, 0]}>
              <coneGeometry args={[0.48, 0.90, 24, 1, true]} />
              <meshStandardMaterial color="#7DD3FC" roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.48, 0.028, 10, 24]} />
              <meshStandardMaterial color="#F43F5E" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.45, 0.018, 10, 24]} />
              <meshStandardMaterial color="#FACC15" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.93, 0]}>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial color="#FB7185" roughness={0.8} />
            </mesh>
            <mesh position={[0.22, 0.32, 0.20]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#FACC15" roughness={0.4} />
            </mesh>
            <mesh position={[-0.20, 0.48, 0.16]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
            </mesh>
            <mesh position={[0.04, 0.64, 0.18]}>
              <sphereGeometry args={[0.036, 8, 8]} />
              <meshStandardMaterial color="#F43F5E" roughness={0.4} />
            </mesh>
            <mesh position={[-0.16, 0.28, 0.24]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#FB7185" roughness={0.4} />
            </mesh>
            <mesh position={[0.16, 0.52, 0.14]}>
              <sphereGeometry args={[0.036, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
            </mesh>
          </group>
        )}
      </>
    );
  }
);
