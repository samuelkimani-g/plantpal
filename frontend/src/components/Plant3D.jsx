"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { useSpring, animated } from "@react-spring/three"
import * as THREE from "three"
import { useGLTF } from "@react-three/drei"
import { Html, Text } from "@react-three/drei"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

const DEAD_MODEL = "/assets/models/tree.glb"
const GROWTH_MODEL = "/assets/models/didelta_spinosa_4k.gltf/didelta_spinosa_4k.gltf"

// Preload models for smoother transitions
useGLTF.preload(DEAD_MODEL)
useGLTF.preload(GROWTH_MODEL)

const FALLING_LEAF_COLORS = {
  healthy: "#4caf50",
  happy: "#43e97b",
  fair: "#ffd600",
  poor: "#ff9800",
  sad: "#2196f3",
  critical: "#b71c1c"
};

// Falling leaf component with mood-based colors
function FallingLeaf({ position, mood, onComplete }) {
  const leafRef = useRef()
  const [fallSpeed] = useState(0.02 + Math.random() * 0.03)
  const [rotationSpeed] = useState((Math.random() - 0.5) * 0.1)
  
  const leafColor = useMemo(() => {
    switch (mood) {
      case 'happy': return '#4ade80' // Green
      case 'neutral': return '#10b981' // Emerald  
      case 'sad': return '#fbbf24' // Yellow
      case 'poor': case 'stressed': return '#ef4444' // Red
      case 'energetic': return '#f59e0b' // Orange
      case 'calm': return '#8b5cf6' // Purple
      default: return '#10b981'
    }
  }, [mood])

  useFrame((state) => {
    if (leafRef.current) {
      leafRef.current.position.y -= fallSpeed
      leafRef.current.rotation.z += rotationSpeed
      leafRef.current.rotation.x += rotationSpeed * 0.5
      
      // Remove leaf when it falls below ground
      if (leafRef.current.position.y < -2) {
        onComplete()
      }
      
      // Add subtle floating motion
      leafRef.current.position.x += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.005
    }
  })

  return (
    <mesh ref={leafRef} position={position}>
      <planeGeometry args={[0.1, 0.15]} />
      <meshLambertMaterial color={leafColor} transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  )
}

const Plant3D = ({ plantData, isWatering, onWaterComplete, customization = {} }) => {
  const trunkRef = useRef()
  const leavesRef = useRef()
  const flowersRef = useRef()
  const waterParticlesRef = useRef()
  const [fallingLeaves, setFallingLeaves] = useState([])
  const [leafCounter, setLeafCounter] = useState(0)

  // Extract plant data with defaults
  const {
    health_score = 50,
    growth_stage = 1,
    level = 1,
    current_mood_influence = 'neutral',
    three_d_model_params = {},
    water_level = 50,
    combined_mood_score = 0.5
  } = plantData || {}

  // Use backend-calculated 3D params, fallback to defaults
  const {
    trunk_height = 0.5,
    leaf_count = 8,
    color_hue = 0.3,
    canopy_width = 1.0,
    flower_presence = false,
    glow_intensity = 0.0,
    health_factor = health_score / 100,
    growth_factor = growth_stage / 10,
  } = three_d_model_params

  // Decide which model to use
  let showDead = health_score < 30 || current_mood_influence === "sad";
  let showGLTF = !showDead;
  let treeLevel = 1;
  if (growth_stage >= 8) treeLevel = 3;
  else if (growth_stage >= 4) treeLevel = 2;
  
  // Load models
  const gltfModel = useGLTF(GROWTH_MODEL);
  const deadGltf = useGLTF(DEAD_MODEL);

  // Animated properties based on plant state
  const { scale, trunkHeight, leafOpacity, glowIntensity } = useSpring({
    scale: Math.max(0.3, growth_stage / 10),
    trunkHeight: trunk_height * (growth_stage / 5),
    leafOpacity: Math.max(0.3, health_score / 100),
    glowIntensity: glow_intensity,
    config: { tension: 120, friction: 14 },
  })

  // Color based on mood and health
  const leafColor = useMemo(() => {
    // Greener for healthy/happy, yellower for low health
    let hue = color_hue
    if (current_mood_influence === "happy") hue = 0.3 // Green
    else if (current_mood_influence === "sad") hue = 0.6 // Blue
    else if (current_mood_influence === "energetic") hue = 0.13 // Yellow-green
    else if (current_mood_influence === "neutral") hue = 0.25
    // Health affects lightness: healthy = greener, unhealthy = yellowish
    const baseSaturation = 0.8
    const baseLightness = 0.35 + health_factor * 0.35
    return new THREE.Color().setHSL(hue, baseSaturation, baseLightness)
  }, [health_score, current_mood_influence, color_hue, health_factor])

  // Generate leaves based on leaf_count and growth
  const leaves = useMemo(() => {
    const leafArray = []
    const actualLeafCount = Math.max(2, Math.floor(leaf_count * growth_factor))
    for (let i = 0; i < actualLeafCount; i++) {
      const angle = (i / actualLeafCount) * Math.PI * 2
      const radius = canopy_width * (0.3 + Math.random() * 0.4)
      const height = trunk_height + Math.random() * 0.3
      leafArray.push({
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
        rotation: [Math.random() * 0.5, angle, Math.random() * 0.3],
        scale: 0.8 + Math.random() * 0.4,
      })
    }
    return leafArray
  }, [leaf_count, growth_stage, canopy_width, trunk_height, growth_factor])

  // Water particles effect
  const waterParticles = useMemo(() => {
    if (!isWatering) return []

    const particles = []
    for (let i = 0; i < 20; i++) {
      particles.push({
        position: [(Math.random() - 0.5) * 2, 2 + Math.random(), (Math.random() - 0.5) * 2],
        velocity: [(Math.random() - 0.5) * 0.1, -Math.random() * 0.2 - 0.1, (Math.random() - 0.5) * 0.1],
      })
    }
    return particles
  }, [isWatering])

  // Determine leaf dropping frequency based on mood
  const getLeafDropFrequency = (mood) => {
    switch (mood) {
      case 'happy': return 0.98 // Rare green leaves
      case 'neutral': return 1.0 // No leaves fall
      case 'sad': return 0.95 // Yellow leaves
      case 'poor': case 'stressed': return 0.92 // More red leaves
      case 'energetic': return 0.97 // Occasional orange leaves
      case 'calm': return 0.99 // Rare purple leaves
      default: return 1.0
    }
  }

  // Add falling leaves based on mood
  useFrame((state) => {
    if (trunkRef.current && Math.random() > getLeafDropFrequency(current_mood_influence)) {
      const newLeaf = {
        id: leafCounter,
        position: [
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 1,
          (Math.random() - 0.5) * 2
        ],
        mood: current_mood_influence
      }
      
      setFallingLeaves(prev => [...prev, newLeaf])
      setLeafCounter(prev => prev + 1)
    }
  })

  const removeLeaf = (leafId) => {
    setFallingLeaves(prev => prev.filter(leaf => leaf.id !== leafId))
  }

  // Handle watering completion
  useEffect(() => {
    if (isWatering) {
      const timer = setTimeout(() => {
        onWaterComplete?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isWatering, onWaterComplete])

  // Pick color for falling leaves
  let fallingColor = FALLING_LEAF_COLORS.healthy;
  if (health_score < 30) fallingColor = FALLING_LEAF_COLORS.poor;
  if (current_mood_influence === "sad") fallingColor = FALLING_LEAF_COLORS.sad;
  if (health_score < 15) fallingColor = FALLING_LEAF_COLORS.critical;
  if (current_mood_influence === "happy") fallingColor = FALLING_LEAF_COLORS.happy;

  // If dead, show only the dead tree
  if (showDead && deadGltf) {
    return <primitive object={deadGltf.scene} scale={0.7} />;
  }
  // If alive, show only the correct tree node
  if (showGLTF && gltfModel) {
    let nodeName = "didelta_spinosa_small_LOD0";
    if (treeLevel === 2) nodeName = "didelta_spinosa_medium_LOD0";
    if (treeLevel === 3) nodeName = "didelta_spinosa_large_LOD0";
    const node = gltfModel.nodes[nodeName];
    return (
      <group>
        <primitive object={node} scale={0.5} />
        {/* Animated falling leaves */}
        {health_score > 0 && fallingLeaves.map((leaf) => (
          <FallingLeaf
            key={leaf.id}
            position={[leaf.position[0], leaf.position[1], leaf.position[2]]}
            mood={leaf.mood}
            onComplete={() => removeLeaf(leaf.id)}
          />
        ))}
      </group>
    );
  }

  // Fallback: procedural plant
  return (
    <animated.group ref={trunkRef} scale={scale}>
      {/* Pot style emoji label (if not classic) */}
      {customization.pot && customization.pot !== "classic" && (
        <Html center position={[0, -0.3, 0]} style={{ pointerEvents: 'none' }}>
          <span style={{ fontSize: '2rem' }}>
            {customization.pot === "modern" ? "🏺" : customization.pot === "colorful" ? "🌈" : "🪴"}
          </span>
        </Html>
      )}
      {/* Trunk */}
      <animated.mesh position={[0, trunkHeight.to((h) => h / 2), 0]}>
        <cylinderGeometry args={[0.05, 0.08, trunkHeight, 8]} />
        <meshLambertMaterial color="#8B4513" />
      </animated.mesh>
      {/* Leaves */}
      <animated.group ref={leavesRef} opacity={leafOpacity}>
        {leaves.map((leaf, i) => (
          <mesh key={i} position={leaf.position} rotation={leaf.rotation} scale={leaf.scale}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshLambertMaterial color={leafColor} side={THREE.DoubleSide} transparent opacity={leafOpacity} />
          </mesh>
        ))}
      </animated.group>
      {/* Flowers (if present) */}
      {flower_presence && (
        <group ref={flowersRef}>
          {[...Array(Math.floor(growth_stage / 3))].map((_, i) => (
            <mesh key={i} position={[Math.cos(i * 2) * 0.4, trunk_height + 0.2, Math.sin(i * 2) * 0.4]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshLambertMaterial color="#FF69B4" />
            </mesh>
          ))}
        </group>
      )}
      {/* Glow effect */}
      {glow_intensity > 0 && (
        <pointLight position={[0, trunk_height + 0.5, 0]} color={leafColor} intensity={glow_intensity} distance={2} />
      )}
      {/* Water particles */}
      {isWatering && (
        <group ref={waterParticlesRef}>
          {waterParticles.map((particle, i) => (
            <mesh key={i} position={particle.position}>
              <sphereGeometry args={[0.02, 4, 4]} />
              <meshLambertMaterial color="#00BFFF" />
            </mesh>
          ))}
        </group>
      )}
    </animated.group>
  )
}

export default Plant3D
