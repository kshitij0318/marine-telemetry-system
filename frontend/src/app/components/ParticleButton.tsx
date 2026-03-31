import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface ParticleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ParticleButton({ children, onClick, className = '' }: ParticleButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isHovered) {
      setParticles([]);
      return;
    }

    const interval = setInterval(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const mouseX = Math.random() * rect.width;
        const mouseY = Math.random() * rect.height;

        const newParticles: Particle[] = [];
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 1;
          
          newParticles.push({
            id: particleIdRef.current++,
            x: mouseX,
            y: mouseY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            size: Math.random() * 4 + 2,
          });
        }
        
        setParticles(prev => [...prev, ...newParticles]);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    const animate = () => {
      setParticles(prev =>
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1, // gravity
            life: particle.life - 0.02,
          }))
          .filter(particle => particle.life > 0)
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <Button
        ref={buttonRef}
        className={`relative overflow-visible ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {children}
      </Button>
      
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: '#00d9ff',
            opacity: particle.life,
            boxShadow: '0 0 10px #00d9ff',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
