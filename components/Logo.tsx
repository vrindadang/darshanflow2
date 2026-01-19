
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Outer Glow/Shadow Circle */}
      <circle cx="250" cy="230" r="210" fill="white" />
      
      {/* Circular Background */}
      <circle cx="250" cy="230" r="195" fill="#FFE0B2" fillOpacity="0.4" stroke="#FB8C00" strokeWidth="1" />
      
      {/* Main Circular Frame */}
      <path d="M70 230 A 180 180 0 0 1 430 230" stroke="#E53935" strokeWidth="25" fill="none" strokeLinecap="round" />
      <path d="M120 230 A 130 130 0 0 1 380 230" stroke="#81D4FA" strokeWidth="20" fill="none" strokeLinecap="round" />

      {/* Central Lotus petals */}
      <path d="M250 160 Q 280 200 250 280 Q 220 200 250 160" fill="#03A9F4" />
      <path d="M245 275 Q 180 260 170 210 Q 210 190 245 275" fill="#03A9F4" />
      <path d="M255 275 Q 320 260 330 210 Q 290 190 255 275" fill="#29B6F6" />
      <path d="M240 280 Q 150 340 210 360 Q 240 320 240 280" fill="#0288D1" />
      <path d="M260 280 Q 350 340 290 360 Q 260 320 260 280" fill="#0277BD" />

      {/* Top Red Spiral */}
      <path 
        d="M250 140 C 270 140 270 110 250 110 C 235 110 235 130 250 130 C 260 130 260 120 250 120" 
        stroke="#D32F2F" 
        strokeWidth="3" 
        fill="none" 
      />
      <circle cx="250" cy="125" r="20" stroke="#D32F2F" strokeWidth="1" fill="none" strokeDasharray="2 2" />

      {/* Text Path for Darshan Academy */}
      <defs>
        <path id="textCircle" d="M100 230 A 150 150 0 0 1 400 230" />
      </defs>
      <text fill="#000" fontSize="36" fontWeight="bold" letterSpacing="4">
        <textPath xlinkHref="#textCircle" startOffset="50%" textAnchor="middle">
          DARSHAN ACADEMY
        </textPath>
      </text>

      {/* Bottom Ribbon */}
      <path d="M30 400 Q 100 370 250 400 Q 400 370 470 400 L 450 450 Q 400 420 250 450 Q 100 420 50 450 Z" fill="#FFE0B2" stroke="#BCAAA4" strokeWidth="1" />
      
      {/* Ribbon Rolls */}
      <path d="M30 400 Q 10 400 10 425 Q 10 450 30 450 Q 50 450 50 425 L 30 400" fill="#D7CCC8" stroke="#A1887F" />
      <path d="M470 400 Q 490 400 490 425 Q 490 450 470 450 Q 450 450 450 425 L 470 400" fill="#D7CCC8" stroke="#A1887F" />

      {/* Motto Text */}
      <text x="100" y="435" fill="#000" fontSize="24" fontWeight="bold" textAnchor="middle" transform="rotate(-5, 100, 435)">BE GOOD</text>
      <text x="250" y="440" fill="#000" fontSize="26" fontWeight="bold" textAnchor="middle">DO GOOD</text>
      <text x="400" y="435" fill="#000" fontSize="24" fontWeight="bold" textAnchor="middle" transform="rotate(5, 400, 435)">BE ONE</text>
    </svg>
  );
};

export default Logo;
