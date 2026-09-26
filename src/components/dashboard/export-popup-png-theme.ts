const TIMEZONE = "America/Sao_Paulo";

/** Data de hoje (Brasília) pronta pro header do PNG ("09/08/26") e pro nome do arquivo ("09-08-26"). */
export function getDataPngHoje(): { header: string; file: string } {
  const header = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  return { header, file: header.replace(/\//g, "-") };
}
