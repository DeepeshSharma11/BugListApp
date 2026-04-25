import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

export default function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  // Keep refs for values needed in the animation loop
  const themeRef = useRef(theme);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Configuration ---
    const PARTICLE_COUNT = 600;
    const INTERACTION_RADIUS = 150; // pixels
    const RETURN_SPEED = 0.05;
    const PUSH_FORCE = 0.3;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position camera so that 1 unit in Z corresponds to about 1 pixel at Z=0
    // Field of view is 75 degrees. Distance d = (height / 2) / Math.tan((75/2) * Math.PI / 180)
    const setCameraDistance = () => {
      camera.position.z = (window.innerHeight / 2) / Math.tan((75 / 2) * (Math.PI / 180));
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    setCameraDistance();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // Force pixel ratio to 1 for massive backdrop-filter performance boost
    mountRef.current.appendChild(renderer.domElement);

    // --- Particles Setup ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Randomly distribute across the screen width and height
      const x = (Math.random() - 0.5) * window.innerWidth * 1.5;
      const y = (Math.random() - 0.5) * window.innerHeight * 1.5;
      const z = (Math.random() - 0.5) * 200; // Slight depth variation

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Dynamic material to smoothly change color based on theme
    const darkColor = new THREE.Color('#3b82f6'); // bright blue for dark mode
    const lightColor = new THREE.Color('#9ca3af'); // subtle gray/blue for light mode
    
    const material = new THREE.PointsMaterial({
      size: 8,
      sizeAttenuation: true,
      color: themeRef.current === 'dark' ? darkColor : lightColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- Event Listeners ---
    let targetMouse = { x: -9999, y: -9999 };

    const onMouseMove = (event: MouseEvent) => {
      // Convert to screen coordinates relative to center (like Three.js coords)
      targetMouse.x = event.clientX - window.innerWidth / 2;
      targetMouse.y = -(event.clientY - window.innerHeight / 2);
    };

    const onResize = () => {
      setCameraDistance();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // --- Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      
      // Smoothly update mouse position
      mouseRef.current.x += (targetMouse.x - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (targetMouse.y - mouseRef.current.y) * 0.1;

      // Smoothly transition color
      const targetColor = themeRef.current === 'dark' ? darkColor : lightColor;
      material.color.lerp(targetColor, 0.05);

      // Update particle positions
      const positionsAttribute = geometry.attributes.position;
      const positionsArray = positionsAttribute.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        const px = positionsArray[i3];
        const py = positionsArray[i3 + 1];
        const pz = positionsArray[i3 + 2];

        const ox = originalPositions[i3];
        const oy = originalPositions[i3 + 1];
        const oz = originalPositions[i3 + 2];

        // Slight float/drift
        const time = clock.getElapsedTime();
        const driftX = Math.sin(time * 0.5 + i) * 10;
        const driftY = Math.cos(time * 0.3 + i) * 10;
        
        const targetX = ox + driftX;
        const targetY = oy + driftY;
        const targetZ = oz;

        // Mouse interaction
        const dx = mouseRef.current.x - px;
        const dy = mouseRef.current.y - py;
        const distSq = dx * dx + dy * dy;

        if (distSq < INTERACTION_RADIUS * INTERACTION_RADIUS) {
          const dist = Math.sqrt(distSq);
          const force = (INTERACTION_RADIUS - dist) / INTERACTION_RADIUS;
          
          velocities[i3] -= (dx / dist) * force * PUSH_FORCE * 100;
          velocities[i3 + 1] -= (dy / dist) * force * PUSH_FORCE * 100;
        }

        // Spring back to target
        velocities[i3] += (targetX - px) * RETURN_SPEED;
        velocities[i3 + 1] += (targetY - py) * RETURN_SPEED;
        velocities[i3 + 2] += (targetZ - pz) * RETURN_SPEED;

        // Apply friction
        velocities[i3] *= 0.85;
        velocities[i3 + 1] *= 0.85;
        velocities[i3 + 2] *= 0.85;

        // Update positions
        positionsArray[i3] += velocities[i3] * delta * 60;
        positionsArray[i3 + 1] += velocities[i3 + 1] * delta * 60;
        positionsArray[i3 + 2] += velocities[i3 + 2] * delta * 60;
      }

      positionsAttribute.needsUpdate = true;

      // Slowly rotate the entire particle system
      particles.rotation.z += 0.0005;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
      
      // Free GPU memory
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); // Run once on mount

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Keep behind everything
        pointerEvents: 'none', // Don't block clicks
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    />
  );
}
