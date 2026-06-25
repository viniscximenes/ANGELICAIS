"use client";

export function LoginBackground() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0 select-none bg-zinc-950">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes waveMotion1 {
          0%, 100% {
            d: path("M-100,300 C300,100 500,550 800,350 C1100,200 1300,600 1600,450");
          }
          50% {
            d: path("M-100,300 C300,500 500,250 800,500 C1100,650 1300,300 1600,450");
          }
        }
        
        @keyframes waveMotion2 {
          0%, 100% {
            d: path("M-100,450 C200,600 450,250 850,550 C1150,300 1300,500 1600,350");
          }
          50% {
            d: path("M-100,450 C200,300 450,550 850,300 C1150,550 1300,300 1600,350");
          }
        }

        @keyframes waveMotion3 {
          0%, 100% {
            d: path("M-100,550 C300,350 700,650 1000,400 C1200,250 1350,550 1600,480");
          }
          50% {
            d: path("M-100,550 C300,650 700,300 1000,550 C1200,600 1350,350 1600,480");
          }
        }

        @keyframes waveMotion4 {
          0%, 100% {
            d: path("M-100,380 C400,200 700,600 1000,380 C1200,520 1350,280 1600,420");
          }
          50% {
            d: path("M-100,380 C400,520 700,200 1000,520 C1200,280 1350,550 1600,420");
          }
        }

        @keyframes waveMotion5 {
          0%, 100% {
            d: path("M-100,480 C250,650 650,300 1050,550 C1250,320 1350,580 1600,400");
          }
          50% {
            d: path("M-100,480 C250,300 650,580 1050,320 C1250,550 1350,300 1600,400");
          }
        }

        @keyframes waveMotion6 {
          0%, 100% {
            d: path("M-100,320 C200,480 600,250 900,600 C1200,350 1400,550 1600,320");
          }
          50% {
            d: path("M-100,320 C200,250 600,600 900,250 C1200,550 1400,300 1600,320");
          }
        }

        @keyframes waveMotion7 {
          0%, 100% {
            d: path("M-100,580 C350,380 600,620 950,320 C1150,580 1300,400 1600,520");
          }
          50% {
            d: path("M-100,580 C350,580 600,320 950,580 C1150,320 1300,580 1600,520");
          }
        }

        @keyframes waveMotion8 {
          0%, 100% {
            d: path("M-100,410 C200,580 550,280 850,500 C1100,620 1350,350 1600,470");
          }
          50% {
            d: path("M-100,410 C200,280 550,580 850,350 C1100,280 1350,580 1600,470");
          }
        }

        .fiber-core {
          fill: none;
          stroke-linecap: round;
        }
        .fiber-glow {
          fill: none;
          stroke-linecap: round;
          opacity: 0.16;
        }

        /* Fiber 1 - Green */
        .f1-glow { stroke: #22c55e; stroke-width: 6.0; animation: waveMotion1 16s ease-in-out infinite; }
        .f1-core { stroke: #22c55e; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion1 16s ease-in-out infinite; }

        /* Fiber 2 - Blue */
        .f2-glow { stroke: #3b82f6; stroke-width: 6.0; animation: waveMotion2 20s ease-in-out infinite; }
        .f2-core { stroke: #3b82f6; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion2 20s ease-in-out infinite; }

        /* Fiber 3 - Cyan */
        .f3-glow { stroke: #06b6d4; stroke-width: 6.0; animation: waveMotion3 24s ease-in-out infinite; }
        .f3-core { stroke: #06b6d4; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion3 24s ease-in-out infinite; }

        /* Fiber 4 - Emerald */
        .f4-glow { stroke: #10b981; stroke-width: 6.0; animation: waveMotion4 18s ease-in-out infinite; }
        .f4-core { stroke: #10b981; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion4 18s ease-in-out infinite; }

        /* Fiber 5 - Indigo */
        .f5-glow { stroke: #6366f1; stroke-width: 6.0; animation: waveMotion5 22s ease-in-out infinite; }
        .f5-core { stroke: #6366f1; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion5 22s ease-in-out infinite; }

        /* Fiber 6 - Teal */
        .f6-glow { stroke: #14b8a6; stroke-width: 6.0; animation: waveMotion6 26s ease-in-out infinite; }
        .f6-core { stroke: #14b8a6; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion6 26s ease-in-out infinite; }

        /* Fiber 7 - Sky Blue */
        .f7-glow { stroke: #0ea5e9; stroke-width: 6.0; animation: waveMotion7 28s ease-in-out infinite; }
        .f7-core { stroke: #0ea5e9; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion7 28s ease-in-out infinite; }

        /* Fiber 8 - Mint Green */
        .f8-glow { stroke: #34d399; stroke-width: 6.0; animation: waveMotion8 30s ease-in-out infinite; }
        .f8-core { stroke: #34d399; stroke-width: 1.2; stroke-opacity: 0.5; animation: waveMotion8 30s ease-in-out infinite; }
      `}} />

      {/* SVG Container with 35% opacity */}
      <svg className="w-full h-full opacity-35" viewBox="0 0 1440 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        {/* Fiber 1 */}
        <path d="M-100,300 C300,100 500,550 800,350 C1100,200 1300,600 1600,450" className="fiber-glow f1-glow" />
        <path d="M-100,300 C300,100 500,550 800,350 C1100,200 1300,600 1600,450" className="fiber-core f1-core" />

        {/* Fiber 2 */}
        <path d="M-100,450 C200,600 450,250 850,550 C1150,300 1300,500 1600,350" className="fiber-glow f2-glow" />
        <path d="M-100,450 C200,600 450,250 850,550 C1150,300 1300,500 1600,350" className="fiber-core f2-core" />

        {/* Fiber 3 */}
        <path d="M-100,550 C300,350 700,650 1000,400 C1200,250 1350,550 1600,480" className="fiber-glow f3-glow" />
        <path d="M-100,550 C300,350 700,650 1000,400 C1200,250 1350,550 1600,480" className="fiber-core f3-core" />

        {/* Fiber 4 */}
        <path d="M-100,380 C400,200 700,600 1000,380 C1200,520 1350,280 1600,420" className="fiber-glow f4-glow" />
        <path d="M-100,380 C400,200 700,600 1000,380 C1200,520 1350,280 1600,420" className="fiber-core f4-core" />

        {/* Fiber 5 */}
        <path d="M-100,480 C250,650 650,300 1050,550 C1250,320 1350,580 1600,400" className="fiber-glow f5-glow" />
        <path d="M-100,480 C250,650 650,300 1050,550 C1250,320 1350,580 1600,400" className="fiber-core f5-core" />

        {/* Fiber 6 */}
        <path d="M-100,320 C200,480 600,250 900,600 C1200,350 1400,550 1600,320" className="fiber-glow f6-glow" />
        <path d="M-100,320 C200,480 600,250 900,600 C1200,350 1400,550 1600,320" className="fiber-core f6-core" />

        {/* Fiber 7 */}
        <path d="M-100,580 C350,380 600,620 950,320 C1150,580 1300,400 1600,520" className="fiber-glow f7-glow" />
        <path d="M-100,580 C350,380 600,620 950,320 C1150,580 1300,400 1600,520" className="fiber-core f7-core" />

        {/* Fiber 8 */}
        <path d="M-100,410 C200,580 550,280 850,500 C1100,620 1350,350 1600,470" className="fiber-glow f8-glow" />
        <path d="M-100,410 C200,580 550,280 850,500 C1100,620 1350,350 1600,470" className="fiber-core f8-core" />
      </svg>

      {/* Blue Glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-20" 
        style={{
          background: "radial-gradient(circle at 40% 50%, #091755 0%, transparent 65%)",
        }}
      />

      {/* Green Glow */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full pointer-events-none z-0 blur-[140px] opacity-[0.12]" 
        style={{
          background: "radial-gradient(circle, #22c55e 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
