import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Ship, Map, Satellite, Droplet, Waves, Fan, Radio, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Ship, label: 'Fleet', path: '/fleet' },
  { icon: Map, label: 'Maps', path: '/map' },
  { icon: Satellite, label: 'GNSS', path: '/gnss' },
  { icon: Droplet, label: 'CTD', path: '/ctd' },
  { icon: Waves, label: 'Current Meter', path: '/current-meter' },
  { icon: Fan, label: 'Thruster', path: '/thruster' },
  { icon: Radio, label: 'OAS', path: '/oas' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = React.memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`fixed left-0 top-0 h-full bg-marine-sidebar border-r border-marine-border transition-all duration-300 z-[1001] ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full py-4">
          {/* Logo */}
          <div className="flex items-center justify-center h-12 mb-8">
            <div className="w-8 h-8 bg-marine-accent rounded-lg flex items-center justify-center">
              <Ship className="w-5 h-5 text-marine-dark" />
            </div>
            {isExpanded && (
              <span className="ml-3 font-semibold text-marine-text">MTSYS</span>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              const linkContent = (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center h-12 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-marine-accent/10 text-marine-accent shadow-marine-glow'
                      : 'text-marine-text-secondary hover:bg-marine-accent/5 hover:text-marine-text'
                  }`}
                >
                  <div className="flex items-center justify-center w-12">
                    <Icon className="w-5 h-5" />
                  </div>
                  {isExpanded && (
                    <span className="ml-3 text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              );

              return isExpanded ? (
                linkContent
              ) : (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
});
