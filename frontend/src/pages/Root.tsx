import React from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../app/components/Sidebar';
import { Header } from '../app/components/Header';
import { SensorBar } from '../app/components/SensorBar';
import { WelcomeBanner } from '../app/components/WelcomeBanner';
import { ThemeProvider } from '../contexts/ThemeContext';
import { TelemetryProvider } from '../contexts/TelemetryContext';
import { MissionProvider } from '../contexts/MissionContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function Root() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <MissionProvider>
          <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-marine-dark">
              <Sidebar />
              <div className="ml-16">
                <Header />
                <SensorBar />
                <main className="min-h-[calc(100vh-4rem)]">
                  <Outlet />
                </main>
              </div>
              <WelcomeBanner />
            </div>
          </DndProvider>
        </MissionProvider>
      </TelemetryProvider>
    </ThemeProvider>
  );
}
