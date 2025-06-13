
import type React from 'react';

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  // width and height will be passed as props
}

export const AppLogo: React.FC<AppLogoProps> = ({ width, height, ...props }) => {
  return (
    <svg
      version="1.2"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 658 237"
      width={width}
      height={height}
      aria-label="Join Us App Logo"
      role="img"
      {...props}
    >
      <title>Join Us Logo</title>
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
            .t0-joinus-svg { font-size: 150px; fill: #ea638c; font-weight: 400; font-family: "Pacifico", "Pacifico-Regular", cursive; white-space: pre; }
          `}
        </style>
      </defs>
      <text
        id="Join"
        style={{
          transform: 'matrix(1.518, -0.001, 0.001, 1.518, -5.754, -12.208)',
          paintOrder: 'stroke fill markers',
        }}
        stroke="#972758"
        strokeWidth="20"
        strokeLinejoin="round"
      >
        <tspan x="0" y="141.8" className="t0-joinus-svg">J</tspan>
        <tspan y="141.8" className="t0-joinus-svg">o</tspan>
        <tspan y="141.8" className="t0-joinus-svg">i</tspan>
        <tspan y="141.8" className="t0-joinus-svg">n</tspan>
      </text>
      <text
        id="Us"
        style={{
          transform: 'matrix(0.839, 0, 0, 0.839, 466.316, 42.822)',
          paintOrder: 'stroke fill markers',
        }}
        stroke="#972758"
        strokeWidth="20"
        strokeLinejoin="round"
      >
        <tspan x="0" y="141.8" className="t0-joinus-svg">U</tspan>
        <tspan y="141.8" className="t0-joinus-svg">s</tspan>
      </text>
    </svg>
  );
};
