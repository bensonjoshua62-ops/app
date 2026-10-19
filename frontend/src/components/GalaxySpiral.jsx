import React from 'react';
import './GalaxySpiral.css';

const GalaxySpiral = ({ className = '' }) => {
  return (
    <div className={`galaxy-container ${className}`}>
      {/* Core glow */}
      <div className="galaxy-core"></div>
      
      {/* Spiral arms */}
      <div className="spiral-wrapper">
        <div className="spiral-arm arm-1"></div>
        <div className="spiral-arm arm-2"></div>
        <div className="spiral-arm arm-3"></div>
        <div className="spiral-arm arm-4"></div>
      </div>
      
      {/* Star particles */}
      <div className="stars-layer">
        {[...Array(60)].map((_, i) => (
          <div 
            key={i} 
            className="star"
            style={{
              '--delay': `${Math.random() * 5}s`,
              '--duration': `${2 + Math.random() * 3}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--size': `${1 + Math.random() * 2}px`,
              '--opacity': `${0.3 + Math.random() * 0.7}`,
            }}
          ></div>
        ))}
      </div>
      
      {/* Dust clouds */}
      <div className="dust-cloud cloud-1"></div>
      <div className="dust-cloud cloud-2"></div>
      <div className="dust-cloud cloud-3"></div>
      
      {/* 3D depth layers */}
      <div className="depth-layer layer-1"></div>
      <div className="depth-layer layer-2"></div>
      <div className="depth-layer layer-3"></div>
    </div>
  );
};

export default GalaxySpiral;
