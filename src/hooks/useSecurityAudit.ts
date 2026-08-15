import { useState, useCallback } from 'react';
import { SecurityAuditResult } from '@/types';
import { runSecurityAudit, generateSecurityBlueprint } from '@/services/security';
import { limitTextContext } from '@/utils/textLimiter';

export function useSecurityAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [lastContextFiles, setLastContextFiles] = useState<{ path: string; content: string }[]>([]);

  const runAudit = useCallback(async (
    files: { path: string; content: string }[],
    projectName: string,
    apiKey?: string
  ) => {
    setIsAuditing(true);
    setAuditError(null);
    try {
      const limitedFiles = files.map((f) => ({ path: f.path, content: limitTextContext(f.content) }));
      setLastContextFiles(limitedFiles);
      const result = await runSecurityAudit(limitedFiles, projectName, apiKey);
      setAuditResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na auditoria.';
      setAuditError(message);
      throw err;
    } finally {
      setIsAuditing(false);
    }
  }, []);

  const downloadBlueprint = useCallback(async (projectName: string, apiKey?: string) => {
    if (!auditResult) return;
    setIsGeneratingBlueprint(true);
    try {
      const markdown = await generateSecurityBlueprint(
        auditResult.findings,
        lastContextFiles,
        projectName,
        apiKey
      );
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-blueprint-${projectName.replace(/[^a-z0-9-]+/gi, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }, [auditResult, lastContextFiles]);

  const resetAudit = useCallback(() => {
    setAuditResult(null);
    setAuditError(null);
  }, []);

  return {
    isAuditing,
    auditResult,
    auditError,
    isGeneratingBlueprint,
    runAudit,
    downloadBlueprint,
    resetAudit,
  };
}
