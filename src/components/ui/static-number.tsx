import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface StaticNumberProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  decimalPlaces?: number
  /** Aceito só pra ser intercambiável com NumberTicker — ignorado. */
  delay?: number
}

/**
 * Versão sem animação do NumberTicker (number-ticker.tsx): renderiza direto
 * o valor final, com as MESMAS classes-base e a MESMA formatação que o
 * NumberTicker exibe ao terminar a contagem — o card sai do loading já com
 * o número na tela, sem contar a partir de 0.
 */
export function StaticNumber({
  value,
  decimalPlaces = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delay,
  className,
  ...props
}: StaticNumberProps) {
  return (
    <span
      className={cn(
        "inline-block tracking-wider text-black tabular-nums dark:text-white",
        className
      )}
      {...props}
    >
      {Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(value.toFixed(decimalPlaces)))}
    </span>
  )
}
