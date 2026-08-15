import { getRuleById, SEVERITY_LABEL } from './ruleset';
import { ScoredFinding } from './scoring';
import { computeScore, sortFindingsBySeverity } from './scoring';

export interface FindingContent {
  /** Índice do finding correspondente (na mesma ordem enviada à IA) */
  index: number;
  contexto: string;
  porQueExploravel: string;
  impacto: string;
  diagrama?: string;
  passos: { titulo: string; linguagem: string; codigo: string; comentario?: string }[];
  teste: { linguagem: string; comando: string; codigo: string; resultadoEsperado: string };
  checklist: string[];
  esforco: 'Baixo' | 'Médio' | 'Alto';
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Renderiza o blueprint final em Markdown seguindo, campo a campo, a estrutura
 * de references/blueprint-template.md. Apenas o CONTEÚDO técnico (explicações,
 * código de correcção, testes) vem da IA — a estrutura, tabelas, índice e
 * cabeçalhos são gerados aqui de forma determinística.
 */
export function renderSecurityBlueprint(params: {
  projectName: string;
  date: string;
  findings: ScoredFinding[];
  contents: FindingContent[];
}): string {
  const { projectName, date, findings, contents } = params;
  const scoreResult = computeScore(findings);

  // Emparelha cada finding com o seu conteúdo pela posição ORIGINAL (a mesma
  // ordem em que foram enviados à IA), antes de reordenar por severidade —
  // caso contrário o índice devolvido pela IA deixaria de corresponder.
  const contentByOriginalIndex = new Map(contents.map((c) => [c.index, c]));
  const paired = findings.map((f, originalIndex) => ({
    finding: f,
    content: contentByOriginalIndex.get(originalIndex),
  }));
  const ordered = sortFindingsBySeverity(
    paired.map((p, i) => ({ ...p.finding, __pairIndex: i }))
  ) as (ScoredFinding & { __pairIndex: number })[];

  const indiceRows = ordered
    .map((f, i) => {
      const content = paired[f.__pairIndex].content;
      const rule = getRuleById(f.rule);
      const anchor = slug(`${f.rule}-${rule?.name || f.description}`);
      return `| ${i + 1} | ${f.rule} | ${SEVERITY_LABEL[f.severity]} | ${f.location} | ${content?.esforco || 'Médio'} | [Ver secção](#${anchor}) |`;
    })
    .join('\n');

  const vulnBlocks = ordered
    .map((f) => {
      const rule = getRuleById(f.rule);
      const content = paired[f.__pairIndex].content;
      const ruleName = rule?.name || 'Regra desconhecida';
      const anchor = slug(`${f.rule}-${ruleName}`);

      const passosMd = (content?.passos || [])
        .map(
          (p, idx) => `#### Passo ${idx + 1} — ${p.titulo}

\`\`\`${p.linguagem}
${p.comentario ? `// ${p.comentario}\n` : ''}${p.codigo}
\`\`\``
        )
        .join('\n\n');

      const diagramaBlock = content?.diagrama
        ? `\n### Arquitectura da Correcção\n\n\`\`\`\n${content.diagrama}\n\`\`\`\n`
        : '';

      const checklistMd = (content?.checklist || [])
        .map((item) => `- [ ] ${item}`)
        .join('\n');

      return `---

## [${f.rule}] ${ruleName} — ${SEVERITY_LABEL[f.severity]} {#${anchor}}

### Contexto

**O que existe actualmente:**

\`\`\`
${f.evidence || '// (ver ficheiro indicado)'}
\`\`\`

**Localização:** \`${f.location}\`

**Por que é explorável:**
${content?.porQueExploravel || f.description}

**Impacto potencial:**
${content?.impacto || 'Não especificado.'}
${diagramaBlock}
### Implementação Passo a Passo

${passosMd || '_(correcção não detalhada — reveja manualmente)_'}

### Teste de Validação

\`\`\`${content?.teste?.linguagem || 'typescript'}
// Executar com: ${content?.teste?.comando || 'npm test'}
${content?.teste?.codigo || '// (teste não gerado)'}
\`\`\`

**Resultado esperado:** ${content?.teste?.resultadoEsperado || 'A vulnerabilidade não deve mais ser explorável.'}

### Checklist de Deploy

${checklistMd || '- [ ] Rever correcção manualmente'}
- [ ] Variáveis de ambiente actualizadas (se aplicável)
- [ ] Revisão de código por par antes do merge
`;
    })
    .join('\n');

  return `# 🔐 Blueprint de Correcção de Segurança

**Projecto:** ${projectName}
**Data da auditoria:** ${date}
**Auditado por:** Brada Iota — Security Audit Engine (baseado na Security Audit Skill v1.0)

---

## Score de Segurança

| Métrica | Valor |
|---------|-------|
| Score actual | ${scoreResult.score}/100 |
| Score esperado após correcções | 100/100 |
| Vulnerabilidades CRÍTICO | ${scoreResult.counts.CRITICO} |
| Vulnerabilidades ALTO | ${scoreResult.counts.ALTO} |
| Vulnerabilidades MÉDIO | ${scoreResult.counts.MEDIO} |
| **Resultado actual** | **${scoreResult.classificationLabel}** |

---

## Índice de Vulnerabilidades

| # | Regra | Severidade | Localização | Esforço | Detalhe |
|---|-------|-----------|-------------|---------|---------|
${indiceRows || '| - | - | - | - | - | Nenhuma vulnerabilidade encontrada |'}

> **Esforço:** Baixo (< 1h) · Médio (1–4h) · Alto (> 4h)

${vulnBlocks || '\n_Nenhuma vulnerabilidade encontrada nesta auditoria._\n'}

---

## Checklist Global Pré-Deploy

### Obrigatório (CRÍTICO e ALTO)
- [ ] Todos os CRÍTICO corrigidos e testados
- [ ] Todos os ALTO corrigidos e testados
- [ ] Suite de testes de segurança a passar integralmente
- [ ] Variáveis de ambiente auditadas — nenhum secret no código
- [ ] Rate limiting activo em endpoints de autenticação

### Recomendado (MÉDIO e Boas Práticas)
- [ ] Falhas MÉDIO endereçadas ou agendadas
- [ ] Testes de penetração com IA (R25) realizados
- [ ] Documentação de regras de acesso actualizada

---

## Referências e Recursos

| Recurso | Descrição |
|---------|-----------|
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | Top 10 vulnerabilidades mais críticas da web |
| [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security) | Configuração correcta de Row Level Security |
| [zod](https://zod.dev/) | Validação de schema server-side em TypeScript |

---

_Blueprint gerado automaticamente pelo Brada Iota Security Audit Engine._
_Score e classificação calculados deterministicamente — não pela IA._
`;
}
