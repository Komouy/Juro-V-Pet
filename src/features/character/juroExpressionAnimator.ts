import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import type { PetAttributes, PetBehaviorState, ToyItem } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import { isBedtimeHour } from "../../utils/timeOfDay";
import { shouldShowRainLeaf } from "./juroHelpers";
import {
  SOAP_BUBBLES_DATA,
  WATER_DROPS_DATA,
  Z_OFFSETS,
  dampExp,
  type BathLiveState,
  type FetchBallState,
  type JuroVisualRefs,
} from "./juroTypes";

const _bathDummy = new THREE.Object3D();

interface ExpressionParams {
  t: number;
  delta: number;
  pointer: { x: number; y: number };
  currentState: PetBehaviorState;
  level: number;
  activeHat: string;
  isRaining: boolean;
  isBlowingBubbles: boolean;
  isDraggingFood: boolean;
  isCurrentlyEating: boolean;
  motionScale: number;
  liveAttributes: PetAttributes;
  liveBath: BathLiveState | undefined;
  currentToyBeingPlayed: ToyItem | null;
  fsm: BehaviorStateMachine;
  spring: SpringOscillator3D;
  refs: JuroVisualRefs;
  blinkState: React.RefObject<{ timer: number; nextBlink: number; isBlinking: boolean }>;
  currentLookRef: React.RefObject<{ x: number; y: number }>;
  eatingTimer: React.RefObject<number>;
  fetchBallRef: React.RefObject<FetchBallState>;
  dizzyRef: React.RefObject<{ buildup: number; timer: number; lastSoundAt: number; dragAge: number }>;
  isDizzyRef?: React.RefObject<boolean>;
  dirtyShakeTimer: React.RefObject<{ nextShake: number; timer: number }>;
}

/**
 * Updates Juro's eyes, mouths, cheeks, emotional particles, headwear accessories,
 * soap foam bubbles, and cascading water rinse droplets each frame.
 */
export function updateJuroExpressionsAndParticles(params: ExpressionParams): void {
  const {
    t,
    delta,
    pointer,
    currentState,
    level,
    activeHat,
    isRaining,
    isBlowingBubbles,
    isDraggingFood,
    isCurrentlyEating,
    motionScale,
    liveAttributes,
    liveBath,
    currentToyBeingPlayed,
    fsm,
    spring,
    refs,
    blinkState,
    currentLookRef,
    eatingTimer,
    fetchBallRef,
    dizzyRef,
    isDizzyRef,
    dirtyShakeTimer,
  } = params;

  const sleepBreath = Math.sin(t * 1.5);
  const isEating = currentState === "eating";
  const isPlayingToy = currentState === "play" && Boolean(currentToyBeingPlayed);
  const isDirty = liveAttributes.cleanliness < 45;
  const isNightSleepy = isBedtimeHour();

  type NeedExpression = "hungry" | "tired" | "angry" | "bored" | "normal";
  let expression: NeedExpression = "normal";
  const candidateNeeds: { type: NeedExpression; val: number }[] = [
    { type: "hungry", val: liveAttributes.hunger },
    { type: "tired", val: liveAttributes.energy },
    { type: "angry", val: liveAttributes.affection },
    { type: "bored", val: liveAttributes.happiness },
  ];
  candidateNeeds.sort((a, b) => a.val - b.val);
  if (candidateNeeds[0].val < 45) {
    expression = candidateNeeds[0].type;
  }
  if (isNightSleepy) {
    expression = "tired";
  }

  // Blinking
  blinkState.current.timer += delta;
  if (blinkState.current.timer > blinkState.current.nextBlink) {
    blinkState.current.isBlinking = true;
    if (blinkState.current.timer > blinkState.current.nextBlink + 0.15) {
      blinkState.current.isBlinking = false;
      blinkState.current.timer = 0;
      blinkState.current.nextBlink = 2.2 + Math.random() * 3.5;
    }
  }

  let naturalBlink = 1;
  if (blinkState.current.isBlinking) {
    const bProgress = (blinkState.current.timer - blinkState.current.nextBlink) / 0.15;
    const bClamped = THREE.MathUtils.clamp(bProgress, 0, 1);
    naturalBlink = 1 - Math.sin(bClamped * Math.PI) * 0.88;
  }

  const soapLevelNow = liveBath?.soapLevel ?? 0;
  const isScrubbingNow = liveBath?.isScrubbing ?? false;
  const isRinsingNow = liveBath?.isRinsing ?? false;

  const isSleeping = currentState === "sleep";
  const isDizzy = !isSleeping && dizzyRef.current.timer > 0;
  if (isDizzyRef) {
    isDizzyRef.current = isDizzy;
  }
  const dizzyFade = isDizzy ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;
  const isChewing = isEating && eatingTimer.current > 0.7 && eatingTimer.current < 2.6;
  const isBathSquint = isScrubbingNow || isRinsingNow;
  const isChasingBall =
    isPlayingToy &&
    currentToyBeingPlayed?.id === "bounce-ball" &&
    (fetchBallRef.current.stage === "throwing" ||
      fetchBallRef.current.stage === "bouncing" ||
      fetchBallRef.current.stage === "ground");
  const isPlayingBubbles = isPlayingToy && currentToyBeingPlayed?.id === "bubble-blower";
  const isInteractingHappy = isPlayingToy && !isChasingBall && !isPlayingBubbles;
  const isHappyFace =
    !isSleeping &&
    !isDizzy &&
    (isInteractingHappy || (currentState === "happy" && expression === "normal"));

  const blinkScaleY = isRinsingNow
    ? 0.16
    : isScrubbingNow
    ? 0.26
    : isChewing
    ? 0.22
    : naturalBlink;

  // Awake eyes + gaze tracking
  if (refs.leftEyeRef.current && refs.rightEyeRef.current) {
    const showNormalEyes = !isSleeping && !isDizzy && !isHappyFace;
    refs.leftEyeRef.current.visible = showNormalEyes;
    refs.rightEyeRef.current.visible = showNormalEyes;

    if (showNormalEyes) {
      let targetLookX = pointer.x * 0.08;
      let targetLookY = pointer.y * 0.06;

      if (isChasingBall) {
        const fb = fetchBallRef.current;
        const dx = fb.ballX - spring.position.x;
        const dz = fb.ballZ - spring.position.z;
        const distXZ = Math.hypot(dx, dz) || 1;
        targetLookX = (dx / distXZ) * 0.06;
        targetLookY = (fb.ballY - spring.position.y) * 0.05;
      } else if (isPlayingBubbles) {
        targetLookX = Math.sin(t * 3) * 0.04;
        targetLookY = 0.068;
      } else if (isBlowingBubbles) {
        targetLookX = pointer.x * 0.08;
        targetLookY = pointer.y * 0.06 + 0.04;
      } else if (isDraggingFood) {
        targetLookX = pointer.x * 0.08;
        targetLookY = pointer.y * 0.06 + 0.045;
      } else if (isEating) {
        targetLookX = 0;
        targetLookY = -0.05;
      } else if (expression === "hungry") {
        targetLookX = 0;
        targetLookY = 0.045;
      } else if (expression === "tired") {
        targetLookX = 0;
        targetLookY = -0.025;
      } else if (currentState === "curious") {
        targetLookX = fsm.lookTarget.x * 0.08;
        targetLookY = fsm.lookTarget.y * 0.06;
      }

      targetLookX = THREE.MathUtils.clamp(targetLookX, -0.075, 0.075);
      targetLookY = THREE.MathUtils.clamp(targetLookY, -0.045, 0.075);

      currentLookRef.current.x = dampExp(currentLookRef.current.x, targetLookX, 16.0, delta);
      currentLookRef.current.y = dampExp(currentLookRef.current.y, targetLookY, 16.0, delta);

      const lookX = currentLookRef.current.x;
      const lookY = currentLookRef.current.y;

      refs.leftEyeRef.current.position.x = -0.35 + lookX;
      refs.leftEyeRef.current.position.y = 0.07 + lookY;
      refs.rightEyeRef.current.position.x = 0.35 + lookX;
      refs.rightEyeRef.current.position.y = 0.07 + lookY;

      if (expression === "hungry") {
        refs.leftEyeRef.current.scale.set(1.22, 1.35 * blinkScaleY, 0.52);
        refs.rightEyeRef.current.scale.set(1.22, 1.35 * blinkScaleY, 0.52);
        refs.leftEyeRef.current.rotation.z = 0.16;
        refs.rightEyeRef.current.rotation.z = -0.16;
        if (refs.leftCatchlightRef.current && refs.rightCatchlightRef.current) {
          const catchPulse = 1.35 + Math.sin(t * 8) * 0.2;
          refs.leftCatchlightRef.current.scale.setScalar(catchPulse);
          refs.rightCatchlightRef.current.scale.setScalar(catchPulse);
        }
      } else if (expression === "tired") {
        refs.leftEyeRef.current.scale.set(1.10, 0.20 * blinkScaleY, 0.48);
        refs.rightEyeRef.current.scale.set(1.10, 0.20 * blinkScaleY, 0.48);
        refs.leftEyeRef.current.rotation.z = 0;
        refs.rightEyeRef.current.rotation.z = 0;
      } else if (expression === "angry") {
        refs.leftEyeRef.current.scale.set(1.12, 0.65 * blinkScaleY, 0.52);
        refs.rightEyeRef.current.scale.set(1.12, 0.65 * blinkScaleY, 0.52);
        refs.leftEyeRef.current.rotation.z = 0.32;
        refs.rightEyeRef.current.rotation.z = -0.32;
        if (refs.leftCatchlightRef.current && refs.rightCatchlightRef.current) {
          refs.leftCatchlightRef.current.scale.setScalar(0.65);
          refs.rightCatchlightRef.current.scale.setScalar(0.65);
        }
      } else if (expression === "bored") {
        refs.leftEyeRef.current.scale.set(1.24, 0.22 * blinkScaleY, 0.52);
        refs.rightEyeRef.current.scale.set(1.24, 0.22 * blinkScaleY, 0.52);
        refs.leftEyeRef.current.rotation.z = 0;
        refs.rightEyeRef.current.rotation.z = 0;
      } else {
        refs.leftEyeRef.current.scale.set(1.0, 1.24 * blinkScaleY, 0.52);
        refs.rightEyeRef.current.scale.set(1.0, 1.24 * blinkScaleY, 0.52);
        refs.leftEyeRef.current.rotation.z = -0.05;
        refs.rightEyeRef.current.rotation.z = 0.05;
        if (refs.leftCatchlightRef.current && refs.rightCatchlightRef.current) {
          refs.leftCatchlightRef.current.scale.setScalar(1.0);
          refs.rightCatchlightRef.current.scale.setScalar(1.0);
        }
      }
    }
  }

  if (refs.dizzyEyesGroupRef.current) {
    refs.dizzyEyesGroupRef.current.visible = isDizzy;
    if (isDizzy) {
      if (refs.dizzyLeftEyeRef.current) refs.dizzyLeftEyeRef.current.rotation.z = t * 9.5;
      if (refs.dizzyRightEyeRef.current) refs.dizzyRightEyeRef.current.rotation.z = -t * 9.5;
    }
  }

  const showCatchlights =
    !isSleeping &&
    !isDizzy &&
    !isChewing &&
    !isBathSquint &&
    !isHappyFace &&
    expression !== "bored" &&
    expression !== "tired";

  if (refs.leftCatchlightRef.current && refs.rightCatchlightRef.current) {
    refs.leftCatchlightRef.current.visible = showCatchlights;
    refs.rightCatchlightRef.current.visible = showCatchlights;
  }
  if (refs.leftSubCatchlightRef.current && refs.rightSubCatchlightRef.current) {
    refs.leftSubCatchlightRef.current.visible = showCatchlights;
    refs.rightSubCatchlightRef.current.visible = showCatchlights;
  }

  if (refs.sleepEyesRef.current) {
    refs.sleepEyesRef.current.visible = isSleeping;
    if (isSleeping) {
      refs.sleepEyesRef.current.position.y = 0.01 - sleepBreath * 0.012;
    }
  }

  if (refs.petEyesRef.current) {
    const showPetEyes = !isSleeping && !isDizzy && isHappyFace;
    refs.petEyesRef.current.visible = showPetEyes;
    if (showPetEyes) {
      refs.petEyesRef.current.scale.set(1.12, 1.0, 1);
      refs.petEyesRef.current.position.y = 0.02 + Math.sin(t * 16) * 0.008;
    }
  }

  // Mouths
  const isTiredMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "tired";
  const isHungryMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "hungry";
  const isAngryMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "angry";
  const isBoredMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "bored";
  const isDefaultMouth =
    !isSleeping && !isDizzy && !isHungryMouth && !isAngryMouth && !isBoredMouth && !isTiredMouth;

  if (refs.mouthGroupRef.current) {
    refs.mouthGroupRef.current.visible = isDefaultMouth;
    if (isDefaultMouth) {
      if (isEating) {
        const eatT = eatingTimer.current;
        if (eatT < 0.7) {
          refs.mouthGroupRef.current.scale.set(1.25, 1.4, 1);
        } else if (eatT < 2.5) {
          const chew = 0.35 + Math.abs(Math.sin(t * 16)) * 0.75;
          refs.mouthGroupRef.current.scale.set(1.1, chew, 1);
        } else {
          refs.mouthGroupRef.current.scale.set(1.2, 1.15, 1);
        }
        refs.mouthGroupRef.current.position.set(0, -0.01, 1.035);
      } else if (isDraggingFood) {
        refs.mouthGroupRef.current.scale.set(1.22, 1.35, 1);
        refs.mouthGroupRef.current.position.set(0, -0.015, 1.035);
      } else if (isHappyFace || isBlowingBubbles || isPlayingBubbles) {
        refs.mouthGroupRef.current.scale.set(1.18 + Math.sin(t * 8) * 0.08, 1.16, 1);
        refs.mouthGroupRef.current.position.set(0, -0.01, 1.035);
      } else {
        refs.mouthGroupRef.current.scale.set(1, 1, 1);
        refs.mouthGroupRef.current.position.set(0, -0.01, 1.035);
      }
    }
  }

  if (refs.sleepyMouthGroupRef.current) {
    refs.sleepyMouthGroupRef.current.visible = isTiredMouth;
    if (isTiredMouth) {
      const yawnCycle = (t * 0.75) % 8;
      if (yawnCycle < 1.4) {
        const yawnPhase = Math.sin((yawnCycle / 1.4) * Math.PI);
        refs.sleepyMouthGroupRef.current.scale.set(1.0 + yawnPhase * 0.35, 1.0 + yawnPhase * 1.6, 1);
        refs.sleepyMouthGroupRef.current.position.set(0, -0.035 - yawnPhase * 0.012, 1.035);
      } else {
        refs.sleepyMouthGroupRef.current.scale.set(1, 1, 1);
        refs.sleepyMouthGroupRef.current.position.set(0, -0.035, 1.035);
      }
    }
  }

  if (refs.hungryMouthGroupRef.current) {
    refs.hungryMouthGroupRef.current.visible = isHungryMouth;
    if (isHungryMouth) {
      const quiver = 1 + Math.sin(t * 12) * 0.08;
      refs.hungryMouthGroupRef.current.scale.set(quiver, quiver, 1);
      refs.hungryMouthGroupRef.current.position.set(0, -0.035, 1.035);
    }
  }

  if (refs.poutMouthGroupRef.current) {
    refs.poutMouthGroupRef.current.visible = isAngryMouth;
    if (isAngryMouth) {
      const huff = 1 + Math.sin(t * 8) * 0.05;
      refs.poutMouthGroupRef.current.scale.set(huff, 1, 1);
      refs.poutMouthGroupRef.current.position.set(0, -0.02, 1.035);
    }
  }

  if (refs.flatMouthGroupRef.current) {
    refs.flatMouthGroupRef.current.visible = isBoredMouth;
    if (isBoredMouth) {
      refs.flatMouthGroupRef.current.scale.set(1, 1, 1);
      refs.flatMouthGroupRef.current.position.set(0, -0.02, 1.035);
    }
  }

  // Cheeks & Overlays
  const isAngry = !isSleeping && expression === "angry";
  const cheekColor = isAngry
    ? "#DC2626"
    : isBlowingBubbles || isPlayingBubbles
    ? "#F43F5E"
    : "#F97316";
  if (refs.leftCheekMatRef.current) refs.leftCheekMatRef.current.color.set(cheekColor);
  if (refs.rightCheekMatRef.current) refs.rightCheekMatRef.current.color.set(cheekColor);
  if (refs.leftCheekGroupRef.current && refs.rightCheekGroupRef.current) {
    const cheekScale = isAngry ? 1.25 : 1.0;
    refs.leftCheekGroupRef.current.scale.setScalar(cheekScale);
    refs.rightCheekGroupRef.current.scale.setScalar(cheekScale);
  }

  if (refs.salivaDripRef.current) {
    const showSaliva = !isSleeping && !isEating && !isPlayingToy && expression === "hungry";
    refs.salivaDripRef.current.visible = showSaliva;
    if (showSaliva) {
      refs.salivaDripRef.current.scale.set(1, 0.85 + Math.sin(t * 5) * 0.22, 1);
    }
  }

  if (refs.sweatDropRef.current) {
    const showSweat = !isSleeping && !isPlayingToy && expression === "tired" && !isNightSleepy;
    refs.sweatDropRef.current.visible = showSweat;
    if (showSweat) {
      refs.sweatDropRef.current.position.y = 0.48 + Math.sin(t * 6.5) * 0.035;
    }
  }

  if (refs.angerSteamGroupRef.current) {
    const showSteam = !isSleeping && !isPlayingToy && expression === "angry";
    refs.angerSteamGroupRef.current.visible = showSteam;
    if (showSteam) {
      refs.angerSteamGroupRef.current.scale.setScalar(0.75 + Math.sin(t * 8) * 0.28);
    }
  }

  if (refs.sighCloudRef.current) {
    const showSigh = !isSleeping && !isPlayingToy && expression === "bored";
    refs.sighCloudRef.current.visible = showSigh;
    if (showSigh) {
      const sighCycle = (t * 0.35) % 1;
      refs.sighCloudRef.current.position.set(0.12 + sighCycle * 0.15, -0.02 + sighCycle * 0.42, 1.06);
      refs.sighCloudRef.current.scale.setScalar(Math.sin(sighCycle * Math.PI) * 0.85);
    }
  }

  if (refs.mudGroupRef.current) {
    refs.mudGroupRef.current.visible = isDirty;
  }
  if (refs.dustGroupRef.current) {
    refs.dustGroupRef.current.visible = isDirty;
    if (isDirty) {
      for (let i = 0; i < 3; i++) {
        const speck = refs.dustSpeckRefs.current[i];
        if (speck) {
          const angle = t * 3.5 + (i * Math.PI * 2) / 3;
          const jitter = Math.sin(t * 19 + i * 5) * 0.08;
          speck.position.set(
            Math.cos(angle) * 0.72 + jitter,
            0.35 + Math.sin(t * 4 + i) * 0.3 + jitter,
            Math.sin(angle) * 0.65 + jitter
          );
        }
      }
    }
  }

  if (refs.bodyMeshRef.current) {
    const mat = refs.bodyMeshRef.current.material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;
    if (mat) {
      const cleanRatio = Math.max(0, Math.min(1, liveAttributes.cleanliness / 100));
      mat.roughness = THREE.MathUtils.lerp(0.42, 0.12, cleanRatio);
      if ("clearcoat" in mat && typeof mat.clearcoat === "number") {
        mat.clearcoat = THREE.MathUtils.lerp(0.22, 1.0, cleanRatio);
      }
    }
  }

  if (isDirty && !isSleeping && !isEating && !isPlayingToy) {
    dirtyShakeTimer.current.timer += delta;
    if (dirtyShakeTimer.current.timer > dirtyShakeTimer.current.nextShake) {
      if (refs.groupRef.current) {
        refs.groupRef.current.rotation.z = Math.sin(dirtyShakeTimer.current.timer * 36) * 0.12;
      }
      if (dirtyShakeTimer.current.timer > dirtyShakeTimer.current.nextShake + 0.35) {
        dirtyShakeTimer.current.timer = 0;
        dirtyShakeTimer.current.nextShake = 5 + Math.random() * 5;
        soundEffects.playPlop();
      }
    }
  }

  if (refs.dizzyMouthRef.current) {
    refs.dizzyMouthRef.current.visible = isDizzy;
    if (isDizzy) {
      refs.dizzyMouthRef.current.rotation.z = Math.sin(t * 14) * 0.14;
      refs.dizzyMouthRef.current.scale.set(1 + Math.sin(t * 9) * 0.12, 1, 1);
    }
  }

  if (refs.dizzyHaloRef.current) {
    refs.dizzyHaloRef.current.visible = isDizzy;
    if (isDizzy) {
      refs.dizzyHaloRef.current.rotation.z = Math.sin(t * 4.2) * 0.12 * motionScale;
      for (let i = 0; i < 3; i++) {
        const star = refs.dizzyStarRefs.current[i];
        if (star) {
          const angle = t * 4.6 + (i * Math.PI * 2) / 3;
          star.position.x = Math.cos(angle) * 0.68;
          star.position.z = Math.sin(angle) * 0.56;
          star.position.y = Math.sin(t * 7 + i * 2) * 0.065;
          const s = (0.24 + Math.sin(t * 8 + i) * 0.03) * (0.65 + dizzyFade * 0.35);
          star.scale.set(s, s, 1);
          (star.material as THREE.SpriteMaterial).opacity = dizzyFade;
        }
      }
    }
  }

  if (refs.sleepMouthGroupRef.current) {
    refs.sleepMouthGroupRef.current.visible = isSleeping;
    if (isSleeping) {
      const mouthPulse = 0.85 + (sleepBreath * 0.5 + 0.5) * 0.3;
      refs.sleepMouthGroupRef.current.scale.set(mouthPulse, mouthPulse, 1);
    }
  }

  if (refs.sleepBubbleRef.current) {
    refs.sleepBubbleRef.current.visible = isSleeping;
    if (isSleeping) {
      const bubbleScale = 0.55 + (sleepBreath * 0.5 + 0.5) * 0.65;
      refs.sleepBubbleRef.current.scale.setScalar(bubbleScale);
      refs.sleepBubbleRef.current.position.y = -0.05 + bubbleScale * 0.03;
    }
  }

  if (refs.zzzGroupRef.current) {
    refs.zzzGroupRef.current.visible = isSleeping;
    if (isSleeping) {
      Z_OFFSETS.forEach((offset, idx) => {
        const sprite = refs.zSpriteRefs.current[idx];
        if (sprite) {
          const progress = (t * 0.35 + offset) % 1;
          sprite.position.x = 0.55 + progress * 0.5 + Math.sin(progress * Math.PI * 2) * 0.12;
          sprite.position.y = 0.62 + progress * 1.15;
          sprite.position.z = 0.45;
          const spriteSize = 0.2 + progress * 0.26;
          sprite.scale.set(spriteSize, spriteSize, 1);
          const alpha =
            progress < 0.18
              ? progress / 0.18
              : progress > 0.72
              ? (1 - progress) / 0.28
              : 1.0;
          (sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, alpha));
        }
      });
    }
  }

  if (refs.leafUmbrellaRef.current) {
    const showLeaf = shouldShowRainLeaf(Boolean(isRaining), activeHat);
    refs.leafUmbrellaRef.current.visible = showLeaf;
    if (showLeaf) {
      const rainSway = Math.sin(t * 3.4) * 0.05 + Math.cos(t * 2.1) * 0.03;
      refs.leafUmbrellaRef.current.rotation.z = -0.06 + rainSway;
      refs.leafUmbrellaRef.current.rotation.x = 0.08 + Math.sin(t * 4.2) * 0.035;
      refs.leafUmbrellaRef.current.position.y = 0.52 + Math.sin(t * 3.6) * 0.015;
    }
  }

  if (refs.crownRef.current) {
    const showCrown = level >= 10 && (!activeHat || activeHat === "hat-none");
    refs.crownRef.current.visible = showCrown;
    if (showCrown) {
      refs.crownRef.current.position.y = 0.86 + Math.sin(t * 3.2) * 0.012;
      refs.crownRef.current.rotation.z = Math.sin(t * 2.4) * 0.03;
    }
  }

  if (refs.propellerRef.current) {
    refs.propellerRef.current.rotation.y = t * 14;
  }

  // Soap foam & water droplets instanced meshes
  if (refs.soapFoamInstRef.current) {
    refs.soapFoamInstRef.current.visible = soapLevelNow > 0.01;
    if (soapLevelNow > 0.01) {
      for (let i = 0; i < SOAP_BUBBLES_DATA.length; i++) {
        const b = SOAP_BUBBLES_DATA[i];
        const progress = THREE.MathUtils.clamp((soapLevelNow - b.threshold * 0.82) / 0.18, 0, 1);
        const wobble = isScrubbingNow
          ? 1 + Math.sin(t * 14 + b.phase) * 0.14
          : 1 + Math.sin(t * 3.2 + b.phase) * 0.05;
        const radius = b.size * progress * wobble;

        _bathDummy.position.set(
          b.pos[0],
          b.pos[1] + Math.sin(t * 2.5 + b.phase) * 0.012,
          b.pos[2]
        );
        _bathDummy.rotation.set(0, 0, 0);
        _bathDummy.scale.set(radius, radius, radius);
        _bathDummy.updateMatrix();
        refs.soapFoamInstRef.current.setMatrixAt(i, _bathDummy.matrix);
      }
      refs.soapFoamInstRef.current.instanceMatrix.needsUpdate = true;
    }
  }

  if (refs.waterDropsInstRef.current) {
    refs.waterDropsInstRef.current.visible = isRinsingNow;
    if (isRinsingNow) {
      for (let i = 0; i < WATER_DROPS_DATA.length; i++) {
        const wd = WATER_DROPS_DATA[i];
        const p = (t * wd.speed + wd.offset) % 1;
        const x = THREE.MathUtils.lerp(wd.startX, wd.endX, p);
        const z = THREE.MathUtils.lerp(wd.startZ, wd.endZ, p);
        const y = 1.68 - p * p * 2.5;
        const stretchY = 0.08 + p * 0.07;
        const width = 0.048 * (1 - p * 0.25);

        _bathDummy.position.set(x, y, z);
        _bathDummy.rotation.set(0, 0, 0);
        _bathDummy.scale.set(width, stretchY, width);
        _bathDummy.updateMatrix();
        refs.waterDropsInstRef.current.setMatrixAt(i, _bathDummy.matrix);
      }
      refs.waterDropsInstRef.current.instanceMatrix.needsUpdate = true;
    }
  }

  void isCurrentlyEating;
}
