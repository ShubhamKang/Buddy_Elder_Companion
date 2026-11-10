import React from 'react';

const IndiaMapIcon = () => {
  return (
    <div style={{
      width: '80px',
      height: '65px',
      margin: '0 auto 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <svg
        viewBox="0 0 200 150"
        width="80"
        height="65"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          
          <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1"/>
          </filter>

          <pattern id="gridPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#cbd5e1" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#cbd5e1" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Map Surface Background */}
        <rect 
          x="10" 
          y="10" 
          width="180" 
          height="130" 
          rx="12" 
          fill="url(#mapGradient)"
          filter="url(#mapShadow)"
        />

        {/* Grid Lines on Map */}
        <rect 
          x="10" 
          y="10" 
          width="180" 
          height="130" 
          rx="12" 
          fill="url(#gridPattern)"
          opacity="0.3"
        />

        {/* Road/Path Lines */}
        <path
          d="M30 60 Q60 45 90 55 Q120 65 150 50 Q170 45 180 50"
          stroke="#60a5fa"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        <path
          d="M20 90 Q50 80 80 85 Q110 90 140 80 Q160 75 175 80"
          stroke="#93c5fd"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />

        <path
          d="M40 110 Q70 100 100 105 Q130 110 160 100"
          stroke="#7dd3fc"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Small location dots */}
        <circle cx="45" cy="50" r="2" fill="#64748b" opacity="0.5" />
        <circle cx="75" cy="70" r="2" fill="#64748b" opacity="0.5" />
        <circle cx="120" cy="60" r="2" fill="#64748b" opacity="0.5" />
        <circle cx="140" cy="90" r="2" fill="#64748b" opacity="0.5" />
        <circle cx="60" cy="100" r="2" fill="#64748b" opacity="0.5" />

        {/* Main Location Pin */}
        <g transform="translate(100,75)">
          {/* Pin Shadow */}
          <ellipse cx="0" cy="25" rx="15" ry="5" fill="#000000" opacity="0.2" />
          
          {/* Pin Body */}
          <path
            d="M0 -20 C-11 -20 -20 -11 -20 0 C-20 11 0 25 0 25 C0 25 20 11 20 0 C20 -11 11 -20 0 -20 Z"
            fill="#ef4444"
            filter="url(#mapShadow)"
          />
          
          {/* Pin Inner Circle */}
          <circle cx="0" cy="-2" r="10" fill="white" />
          
          {/* Pin Center Dot */}
          <circle cx="0" cy="-2" r="6" fill="#ef4444" />
          
          {/* Pulsing Effect */}
          <circle cx="0" cy="-2" r="20" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.3">
            <animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
          </circle>
        </g>
      </svg>
    </div>
  );
};

export default IndiaMapIcon; 