/** Remove sufixo de unidade entre parênteses no fim do nome (ex: "TMA (s)" → "TMA"). */
export function stripUnitSuffix(displayName: string): string {
  return displayName.replace(/\s*\([^)]*\)\s*$/, "");
}
