import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { getRuleById } from '@/server/security/ruleset';
import { ScoredFinding } from '@/server/security/scoring';
import { renderSecurityBlueprint, FindingContent } from '@/server/security/blueprint-template';

export const runtime = 'nodejs';

// A IA só preenche conteúdo técnico por vulnerabilidade — nunca a estrutura,
// score, tabelas ou índice do blueprint (isso é gerado em código, ver
// server/security/blueprint-template.ts).
const CONTENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          contexto: { type: 'string' },
          porQueExploravel: { type: 'string' },
          impacto: { type: 'string' },
          diagrama: { type: 'string', description: 'Diagrama ASCII/Mermaid opcional, só se envolver múltiplos componentes' },
          passos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string' },
                linguagem: { type: 'string' },
                codigo: { type: 'string' },
                comentario: { type: 'string' },
              },
              required: ['titulo', 'linguagem', 'codigo'],
            },
          },
          teste: {
            type: 'object',
            properties: {
              linguagem: { type: 'string' },
              comando: { type: 'string' },
              codigo: { type: 'string' },
              resultadoEsperado: { type: 'string' },
            },
            required: ['linguagem', 'codigo', 'resultadoEsperado'],
          },
          checklist: { type: 'array', items: { type: 'string' } },
          esforco: { type: 'string', enum: ['Baixo', 'Médio', 'Alto'] },
        },
        required: ['index', 'contexto', 'porQueExploravel', 'impacto', 'passos', 'teste', 'checklist', 'esforco'],
      },
    },
  },
  required: ['items'],
};

export async function POST(req: NextRequest) {
  try {
    const { findings, contextFiles, projectName, apiKey } = await req.json();

    if (!Array.isArray(findings) || findings.length === 0) {
      // Nenhuma vulnerabilidade: blueprint "limpo", sem chamar a IA.
      const md = renderSecurityBlueprint({
        projectName: projectName || 'Projecto sem nome',
        date: new Date().toLocaleDateString('pt-PT'),
        findings: [],
        contents: [],
      });
      return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }

    const ai = getAIClient(apiKey);
    const fileContext = (contextFiles || [])
      .map((f: any) => `--- ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const findingsForPrompt = (findings as ScoredFinding[]).map((f, i) => {
      const rule = getRuleById(f.rule);
      return `#${i} | Regra ${f.rule} (${rule?.name}) | Severidade ${f.severity}\nLocalização: ${f.location}\nDescrição: ${f.description}\nEvidência:\n${f.evidence}`;
    }).join('\n\n');

    const prompt = `
      Você é um arquiteto de segurança sénior. Para CADA vulnerabilidade abaixo,
      escreva a correcção completa e funcional. Use o "index" exacto de cada
      vulnerabilidade na sua resposta.

      CÓDIGO-FONTE RELEVANTE:
      ${fileContext || '(não fornecido — baseie-se na descrição e evidência)'}

      VULNERABILIDADES A CORRIGIR:
      ${findingsForPrompt}

      Para cada uma, produza: contexto, por que é explorável, impacto, passos de
      implementação com código real e comentado, um teste de validação (jest/
      vitest/pytest conforme a stack), checklist de deploy e estimativa de
      esforço (Baixo/Médio/Alto). Nunca produza código de exploração, apenas de
      correcção. Responda em português (pt-MZ/pt-PT).
    `;

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: CONTENT_RESPONSE_SCHEMA,
    };

    let rawText: string;
    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents: prompt,
        config: generationConfig,
      });
      rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
          config: generationConfig,
        });
        rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } else {
        throw error;
      }
    }

    let parsed: { items: FindingContent[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new AppError('A IA devolveu conteúdo em formato inválido', 502, { rawText });
    }

    const md = renderSecurityBlueprint({
      projectName: projectName || 'Projecto sem nome',
      date: new Date().toLocaleDateString('pt-PT'),
      findings: findings as ScoredFinding[],
      contents: parsed.items || [],
    });

    return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  } catch (error) {
    return jsonError(error);
  }
}
