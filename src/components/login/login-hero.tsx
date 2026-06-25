export function LoginHero() {
  return (
    <div className="relative flex h-[40vh] flex-col items-center justify-center lg:h-screen">
      <div className="relative z-10 flex flex-col items-center justify-center -space-y-32 -mt-16">
        <div className="flex items-center justify-center">
          <img 
            src="/alloha-fibra.png" 
            alt="Alloha Fibra Logo" 
            width={400} 
            height={400}
            className="object-contain"
          />
        </div>

        <div className="text-center">
          <p className="ds-body text-muted-foreground font-mono tracking-widest uppercase text-[10px] opacity-80">
            Sistema de gestão operacional
          </p>
        </div>
      </div>
    </div>
  );
}
