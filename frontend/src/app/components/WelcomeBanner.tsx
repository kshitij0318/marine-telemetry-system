import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ParticleButton } from './ParticleButton';
import { X, Zap } from 'lucide-react';

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-marine-surface border-marine-accent shadow-marine-glow p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={() => setIsVisible(false)}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-marine-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-marine-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-marine-text mb-2">
              Welcome to Marine Telemetry System
            </h3>
            <p className="text-sm text-marine-text-secondary mb-4">
              Hover over the theme button in the header to see the particle effect in action!
            </p>
            <ParticleButton onClick={() => setIsVisible(false)}>
              Got it!
            </ParticleButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
