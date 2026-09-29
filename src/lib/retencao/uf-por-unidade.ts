/**
 * Estado (UF) de cada unidade de retencao_atendimentos.
 *
 * A base não traz a UF — só `unidade_nome` (nome livre, com variações de
 * caixa/acento e sufixos de marca como "ATEX", "NIU", "VIP", "(WOC)") e
 * `unidade_sigla` (código interno, não é UF). Este mapa foi montado a partir
 * da lista real de unidades da base (nome + marca que atende). Os nomes
 * ambíguos foram resolvidos pela marca que atende a unidade — ex.: "CAMPO
 * GRANDE" é da Ligue (MS), "VIANA" é da Atex (MA), "Caxias" é da MobWire
 * (MA), "Cascavel" é da MobWire (CE).
 *
 * Unidade que não estiver aqui cai em "Não identificado" (nunca some do
 * total) — é só acrescentar a linha quando aparecer uma cidade nova.
 */

export const NOME_ESTADO: Record<string, string> = {
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  SE: "Sergipe",
  SP: "São Paulo",
};

/**
 * Casos em que o nome normalizado não basta (mesma cidade escrita igual em
 * dois lugares) — resolvidos pela sigla da unidade.
 * - SSYS "São Sebastião" (Giga+) = região administrativa do DF; as outras
 *   ("SAO SEBASTIAO" SST e "SÃO SEBASTIÃO 2" SSTBO) são do litoral de SP.
 */
const UF_POR_SIGLA: Record<string, string> = {
  SSYS: "DF",
};

/** Nome normalizado (sem acento, maiúsculo, sem sufixo de marca) → UF. */
const UF_POR_NOME: Record<string, string> = {
  // ── Rio de Janeiro (Sumicity) ──
  "APERIBE": "RJ",
  "ARARUAMA": "RJ",
  "ARMACAO DOS BUZIOS": "RJ",
  "ARRAIAL DO CABO": "RJ",
  "BARRA DE SAO JOAO": "RJ",
  "BARRA MANSA": "RJ",
  "BOM JARDIM": "RJ",
  "CABO FRIO": "RJ",
  "CACHOEIRAS DE MACACU": "RJ",
  "CAMBUCI": "RJ",
  "CAMPOS DOS GOYTACAZES": "RJ",
  "CARMO": "RJ",
  "COMENDADOR LEVY GASPARIAN": "RJ",
  "CORDEIRO": "RJ",
  "GUAPIMIRIM": "RJ",
  "IGUABA GRANDE": "RJ",
  "ITAIPAVA": "RJ",
  "ITAOCARA": "RJ",
  "ITAPERUNA": "RJ",
  "JAMAPARA": "RJ",
  "LAJE DO MURIAE": "RJ",
  "MACAE": "RJ",
  "MAGE": "RJ",
  "MIGUEL PEREIRA": "RJ",
  "MIRACEMA": "RJ",
  "NOVA FRIBURGO": "RJ",
  "PARAIBA DO SUL": "RJ",
  "PATY DO ALFERES": "RJ",
  "PETROPOLIS": "RJ",
  "PIABETA": "RJ",
  "PINHEIRAL": "RJ",
  "PORTO REAL": "RJ",
  "PRAIA SECA": "RJ",
  "RESENDE": "RJ",
  "RIO DAS OSTRAS": "RJ",
  "SANTO ANTONIO DE PADUA": "RJ",
  "SAO PEDRO DA ALDEIA": "RJ",
  "SAPUCAIA": "RJ",
  "SAQUAREMA": "RJ",
  "SUMIDOURO": "RJ",
  "TERESOPOLIS": "RJ",
  "TRES RIOS": "RJ",
  "VALENCA": "RJ",
  "VASSOURAS": "RJ",
  "VOLTA REDONDA": "RJ",

  // ── Espírito Santo (Sumicity) ──
  "ANCHIETA": "ES",
  "CACHOEIRO DE ITAPEMIRIM": "ES",
  "CARIACICA": "ES",
  "GUARAPARI": "ES",
  "ITAPEMIRIM": "ES",
  "MARATAIZES": "ES",
  "PIUMA": "ES",
  "SERRA": "ES",
  "VILA VELHA": "ES",
  "VITORIA": "ES",

  // ── Minas Gerais (Sumicity, Click, Univox) ──
  "ALEM PARAIBA": "MG",
  "ARAXA": "MG",
  "BOA ESPERANCA": "MG",
  "CATAGUASES": "MG",
  "CRISTAIS": "MG",
  "DELTA": "MG",
  "GUAPE": "MG",
  "GUARANESIA": "MG",
  "GUAXUPE": "MG",
  "IBIA": "MG",
  "ITAU DE MINAS": "MG",
  "MURIAE": "MG",
  "NEPOMUCENO": "MG",
  "NOVA PONTE": "MG",
  "PASSOS": "MG",
  "PERDIZES": "MG",
  "SACRAMENTO": "MG",
  "SANTA JULIANA": "MG",
  "SAO SEBASTIAO DO PARAISO": "MG",
  "SAO TOMAS DE AQUINO": "MG",
  "UBERABA": "MG",
  "UBERLANDIA": "MG",

  // ── São Paulo (VIP, NIU, Giga+, Click, Univox) ──
  "ALTINOPOLIS": "SP",
  "BERTIOGA": "SP",
  "CACAPAVA": "SP",
  "CARAGUATATUBA": "SP",
  "CUBATAO": "SP",
  "DIADEMA": "SP",
  "FERRAZ DE VASCONCELOS": "SP",
  "FRANCA": "SP",
  "GUARUJA": "SP",
  "GUARULHOS": "SP",
  "ILHABELA": "SP",
  "IPUA": "SP",
  "ITAQUAQUECETUBA": "SP",
  "JACAREI": "SP",
  "MAUA": "SP",
  "MOGI DAS CRUZES": "SP",
  "MONGAGUA": "SP",
  "MORRO AGUDO": "SP",
  "ORLANDIA": "SP",
  "PATROCINIO PAULISTA": "SP",
  "PRAIA GRANDE": "SP",
  "RIBEIRAO PIRES": "SP",
  "RIBEIRAO PRETO": "SP",
  "RIO GRANDE DA SERRA": "SP",
  "SANTOS": "SP",
  "SAO BERNARDO DO CAMPO": "SP",
  "SAO JOAQUIM DA BARRA": "SP",
  "SAO JOSE DOS CAMPOS": "SP",
  "SAO PAULO": "SP",
  "SAO SEBASTIAO": "SP",
  "SAO VICENTE": "SP",
  "SPON": "SP",
  "SUZANO": "SP",

  // ── Paraná / Mato Grosso do Sul (Ligue) ──
  "APUCARANA": "PR",
  "ARAPONGAS": "PR",
  "CAMPO MOURAO": "PR",
  "CIANORTE": "PR",
  "ENGENHEIRO BELTRAO": "PR",
  "JANDAIA DO SUL": "PR",
  "JUSSARA": "PR",
  "MARIALVA": "PR",
  "MARINGA": "PR",
  "PAICANDU": "PR",
  "ROLANDIA": "PR",
  "TELEMACO BORBA": "PR",
  "CAMPO GRANDE": "MS",
  "DOURADOS": "MS",

  // ── Distrito Federal (Giga+) ──
  "ARNIQUEIRAS": "DF",
  "BRASILIA": "DF",
  "CEILANDIA": "DF",
  "GAMA": "DF",
  "RECANTO DAS EMAS": "DF",
  "RIACHO FUNDO": "DF",
  "SAMAMBAIA": "DF",
  "SANTA MARIA": "DF",
  "TAGUATINGA": "DF",

  // ── Maranhão (Atex, MobWire) ──
  "ACAILANDIA": "MA",
  "ALTO ALEGRE DO PINDARE": "MA",
  "BALSAS": "MA",
  "BARRA DO CORDA": "MA",
  "BOM JESUS DAS SELVAS": "MA",
  "BURITICUPU": "MA",
  "CAXIAS": "MA",
  "GRAJAU": "MA",
  "IMPERATRIZ": "MA",
  "PENALVA": "MA",
  "PRESIDENTE DUTRA": "MA",
  "SANTA INES": "MA",
  "SAO JOSE DE RIBAMAR": "MA",
  "SAO LUIS": "MA",
  "TIMON": "MA",
  "VIANA": "MA",
  "VITORIA DO MEARIM": "MA",
  "ZE DOCA": "MA",

  // ── Piauí (MobWire) ──
  "PARNAIBA": "PI",
  "TERESINA": "PI",

  // ── Ceará (MobWire) ──
  "ACOPIARA": "CE",
  "AQUIRAZ": "CE",
  "BARBALHA": "CE",
  "BEBERIBE": "CE",
  "CAMOCIM": "CE",
  "CAMPOS SALES": "CE",
  "CARIUS": "CE",
  "CASCAVEL": "CE",
  "CAUCAIA": "CE",
  "CRATO": "CE",
  "CRUZ": "CE",
  "EUSEBIO": "CE",
  "FORTALEZA": "CE",
  "ICO": "CE",
  "IGUATU": "CE",
  "ITAITINGA": "CE",
  "JIJOCA DE JERICOACOARA": "CE",
  "JUAZEIRO DO NORTE": "CE",
  "JUCAS": "CE",
  "LAVRAS DA MANGABEIRA": "CE",
  "LIMOEIRO DO NORTE": "CE",
  "MARACANAU": "CE",
  "MARANGUAPE": "CE",
  "MAURITI": "CE",
  "MISSAO VELHA": "CE",
  "MOMBACA": "CE",
  "MORADA NOVA": "CE",
  "MUCAMBO": "CE",
  "OROS": "CE",
  "PACAJUS": "CE",
  "PARACURU": "CE",
  "PENTECOSTE": "CE",
  "PINDORETAMA": "CE",
  "QUIXADA": "CE",
  "QUIXELO": "CE",
  "RUSSAS": "CE",
  "SAO GONCALO DO AMARANTE": "CE",
  "SOBRAL": "CE",
  "TAUA": "CE",
  "TRAIRI": "CE",
  "VARZEA ALEGRE": "CE",

  // ── Pernambuco / Rio Grande do Norte (MobWire) ──
  "GOIANA": "PE",
  "ILHA DE ITAMARACA": "PE",
  "IPOJUCA": "PE",
  "ITAPISSUMA": "PE",
  "PAULISTA": "PE",
  "SERRA TALHADA": "PE",
  "TIMBAUBA": "PE",
  "PARNAMIRIM": "RN",

  // ── Sergipe (MobWire) ──
  "ARACAJU": "SE",
  "BARRA DOS COQUEIROS": "SE",
  "JAPOATA": "SE",
  "LAGARTO": "SE",
  "LARANJEIRAS": "SE",
  "NOSSA SENHORA DO SOCORRO": "SE",
  "ROSARIO DO CATETE": "SE",
  "SAO CRISTOVAO": "SE",
};

/**
 * Normaliza o nome da unidade pra busca no mapa: sem acento, maiúsculo,
 * sem sufixo de marca/filial ("ATEX", "NIU", "VIP", "(WOC)") e sem número
 * de filial no fim ("SÃO SEBASTIÃO 2", "Riacho Fundo 1").
 */
function normalizarUnidade(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(ATEX|NIU|VIP)\b/g, " ")
    .replace(/\s+\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** UF da unidade, ou null se ela ainda não estiver mapeada. */
export function ufDaUnidade(nome: string, sigla?: string | null): string | null {
  const porSigla = sigla ? UF_POR_SIGLA[sigla.trim().toUpperCase()] : undefined;
  if (porSigla) return porSigla;
  return UF_POR_NOME[normalizarUnidade(nome)] ?? null;
}
