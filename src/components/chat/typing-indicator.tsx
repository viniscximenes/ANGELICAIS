export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="IA digitando">
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
        style={{ animationDelay: "0ms", animationDuration: "1s" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
        style={{ animationDelay: "160ms", animationDuration: "1s" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
        style={{ animationDelay: "320ms", animationDuration: "1s" }}
      />
    </div>
  );
}
