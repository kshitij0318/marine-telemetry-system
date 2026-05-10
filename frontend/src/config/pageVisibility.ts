/**
 * Page Visibility Configuration
 * 
 * HOW TO TOGGLE:
 * To show only specific dashboards (e.g. GNSS):
 *   Set `enabled: false` for all pages except the desired ones (e.g. `gnss` and `fleet`).
 *   The `fleet` page should generally stay enabled as it serves as the home redirect.
 * 
 * No restart needed if using Vite HMR — saving the file hot-reloads.
 * With Docker: rebuild frontend container after editing if HMR is not active.
 */

export interface PageConfig {
  id: string;
  label: string;
  icon: string;         // lucide-react icon name as string
  path: string;
  enabled: boolean;     // TOGGLE THIS to show/hide the page
  description: string;
}

export const PAGE_CONFIG: PageConfig[] = [
  { id: 'fleet', label: 'Fleet', icon: 'Ship', path: '/fleet', enabled: true, description: 'Fleet overview and notifications' },
  { id: 'maps', label: 'Maps', icon: 'Map', path: '/map', enabled: true, description: 'Navigation, mission, sonar maps' },
  { id: 'gnss', label: 'GNSS', icon: 'Satellite', path: '/gnss', enabled: true, description: 'GNSS positioning dashboard' },
  { id: 'ctd', label: 'CTD', icon: 'Droplet', path: '/ctd', enabled: true, description: 'CTD sensor dashboard' },
  { id: 'current', label: 'Current Meter', icon: 'Waves', path: '/current-meter', enabled: true, description: 'Ocean current meter dashboard' },
  { id: 'thruster', label: 'Thruster', icon: 'Fan', path: '/thruster', enabled: true, description: 'Thruster and fin control dashboard' },
  { id: 'radar', label: 'Radar', icon: 'Radio', path: '/radar', enabled: true, description: 'Radar and OAS echo sounder' },
  { id: 'payload', label: 'Payload', icon: 'Package', path: '/payload', enabled: true, description: 'Payload camera verification feeds' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings', enabled: true, description: 'System settings' },
];
