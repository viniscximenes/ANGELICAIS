import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApplyDeflatorForm } from "@/components/config-rv/apply-deflator-form";
import { ApplyDeflatorList } from "@/components/config-rv/apply-deflator-list";
import { BinaryIndicatorCard } from "@/components/config-rv/binary-indicator-card";
import { CombinedBonusCard } from "@/components/config-rv/combined-bonus-card";
import { ConfigRvTabs } from "@/components/config-rv/config-rv-tabs";
import { DeflatorTypeCard } from "@/components/config-rv/deflator-type-card";
import { EligibilityRuleCard } from "@/components/config-rv/eligibility-rule-card";
import { MultiplierCard } from "@/components/config-rv/multiplier-card";
import { PerUnitIndicatorCard } from "@/components/config-rv/per-unit-indicator-card";
import { PromoteButton } from "@/components/config-rv/promote-button";
import { RuleSetGeneralCard } from "@/components/config-rv/rule-set-general-card";
import { TieredIndicatorCard } from "@/components/config-rv/tiered-indicator-card";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getAllDeflatorApplicationsForMonth } from "@/lib/rv/get-deflator-applications";
import { getAllOperatorsWithEmails } from "@/lib/rv/get-all-operators-with-emails";
import { getFullRuleSet } from "@/lib/rv/get-rule-set";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export const metadata: Metadata = {
  title: "Configurações RV — ANGELICAIS",
};

export default async function ConfigRvPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");
  if (!can(user.profile.role, "manage_system")) redirect("/d-1");

  const fullRuleSet = await getFullRuleSet("current");

  if (!fullRuleSet) {
    return (
      <PageTransition>
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-5xl">
            <div className="elevation-1 rounded-xl p-8 text-center">
              <p className="ds-body text-muted-foreground">
                Erro ao carregar regras de RV. Tente recarregar a página.
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const autoDeflators = fullRuleSet.deflatorTypes.filter((d) => d.isAuto);
  const manualDeflators = fullRuleSet.deflatorTypes.filter((d) => !d.isAuto);

  const currentMesRef = getCurrentMesRef();

  const [operators, applications] = await Promise.all([
    getAllOperatorsWithEmails(),
    getAllDeflatorApplicationsForMonth(currentMesRef),
  ]);

  const regrasContent = (
    <div className="space-y-8">
      <RuleSetGeneralCard
        ruleSet={fullRuleSet.ruleSet}
        hideTeto={fullRuleSet.perUnitIndicators.length > 0}
      />

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Elegibilidade
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Se qualquer regra falhar, RV = R$ 0.
        </p>
        {fullRuleSet.eligibility.map((rule) => (
          <EligibilityRuleCard key={rule.id} rule={rule} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Indicadores com faixas
        </h2>
        {fullRuleSet.tiered.map((t) => (
          <TieredIndicatorCard key={t.id} indicator={t} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Multiplicador por retido
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Valor em R$ por unidade de retido bruto (pedidos − churn), conforme a
          faixa de TX atingida.
        </p>
        <PerUnitIndicatorCard
          ruleSetId={fullRuleSet.ruleSet.id}
          indicator={fullRuleSet.perUnitIndicators[0] ?? null}
        />
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Indicadores binários
        </h2>
        {fullRuleSet.binary.map((b) => (
          <BinaryIndicatorCard key={b.id} indicator={b} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Bônus combinado
        </h2>
        {fullRuleSet.combinedBonus.map((cb) => (
          <CombinedBonusCard key={cb.id} bonus={cb} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Multiplicador
        </h2>
        {fullRuleSet.multiplier && (
          <MultiplierCard multiplier={fullRuleSet.multiplier} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Deflatores automáticos
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Disparados pelo sistema com base em valores do KPI.
        </p>
        {autoDeflators.map((d) => (
          <DeflatorTypeCard key={d.id} deflator={d} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Deflatores manuais
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Cadastrados manualmente pelo ADM via aba &quot;Aplicar Deflator&quot;.
        </p>
        {manualDeflators.map((d) => (
          <DeflatorTypeCard key={d.id} deflator={d} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2" style={{ fontSize: "1.15rem" }}>
          Virada de mês
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Use ao fechar um mês para que as regras atuais virem as regras do
          &quot;mês passado&quot;.
        </p>
        <PromoteButton />
      </section>
    </div>
  );

  const aplicarContent = (
    <div className="space-y-6">
      <div>
        <p className="ds-body mb-1">
          Mês de referência:{" "}
          <span className="font-medium">{currentMesRef}</span>
        </p>
        <p className="ds-mono-sm text-muted-foreground">
          As ocorrências adicionadas afetam o cálculo de RV do mês corrente.
        </p>
      </div>

      <ApplyDeflatorForm
        operators={operators}
        manualDeflators={manualDeflators}
        mesRef={currentMesRef}
      />

      <div className="space-y-3">
        <h3 className="ds-h2" style={{ fontSize: "1.05rem" }}>
          Aplicações deste mês
        </h3>
        <ApplyDeflatorList
          applications={applications}
          manualDeflators={manualDeflators}
          operators={operators}
        />
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">/ RV</span>
            </div>
            <p className="ds-small text-muted-foreground">
              Configure as regras de Remuneração Variável aplicadas ao mês
              atual.
            </p>
          </div>

          <ConfigRvTabs regras={regrasContent} aplicarDeflator={aplicarContent} />
        </div>
      </div>
    </PageTransition>
  );
}
