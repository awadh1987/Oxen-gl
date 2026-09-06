import React from 'react';
import { OxenGLPlatformLayout } from './OxenGLPlatformLayout';

interface PlatformAdminLayoutProps {
  onLogout: () => void;
}

export const PlatformAdminLayout: React.FC<PlatformAdminLayoutProps> = ({ onLogout }) => {
  return <OxenGLPlatformLayout onLogout={onLogout} />;
};
