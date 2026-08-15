import { ShieldAlert, ShieldCheck, Loader2, FileDown, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SecurityAuditResult, SecuritySeverity } from '@/types';

const SEVERITY_STYLES: Record<SecuritySeverity, { badge: string; dot: string; label: string }> = {
  CRITICO: { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-500', label: '🔴 CRÍTICO' },
  ALTO: { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-500', label: '🟠 ALTO' },
  MEDIO: { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', label: '🟡 MÉDIO' },
};

function scoreColor(score: number) {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

export const SecurityAuditPanel = ({
  isAuditing,
  auditResult,
  auditError,
  isGeneratingBlueprint,
  onRunAudit,
  onDownloadBlueprint,
  isMaximized,
  onToggleMaximize,
  hasSelection,
}: {
  isAuditing: boolean;
  auditResult: SecurityAuditResult | null;
  auditError: string | null;
  isGeneratingBlueprint: boolean;
  onRunAudit: () => void;
  onDownloadBlueprint: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  hasSelection: boolean;
}) => {
  return (
    <div className={cn(
      "flex flex-col bg-[#111] rounded-xl border border-white/10 overflow-hidden transition-all duration-300",
      isMaximized ? "h-full" : "h-full lg:h-[600px]"
    )}>
      <div className="p-3 md:p-4 border-b border-white/10 bg-[#151515] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            Auditoria de Segurança
          </h3>
          {isAuditing && (
            <span className="text-xs text-indigo-400 animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              A auditar código-fonte...
            </span>
          )}
        </div>
        <button
          onClick={onToggleMaximize}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!auditResult && !isAuditing && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400 px-6">
            <ShieldAlert className="w-10 h-10 text-indigo-400/60" />
            <p className="text-sm max-w-sm">
              Audite o repositório contra o catálogo R01–R25 + CTF-R01–R11. Score,
              severidade e classificação são calculados de forma determinística.
            </p>
            <button
              onClick={onRunAudit}
              disabled={!hasSelection}
              className="mt-2 text-sm bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg px-4 py-2 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="w-4 h-4" />
              Executar Auditoria
            </button>
            {!hasSelection && (
              <p className="text-[11px] text-gray-500">Seleccione um ficheiro ou aguarde o carregamento do repositório.</p>
            )}
          </div>
        )}

        {isAuditing && !auditResult && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">A analisar contra o catálogo de regras...</p>
          </div>
        )}

        {auditError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
            Erro: {auditError}
          </div>
        )}

        {auditResult && (
          <>
            {/* Score card */}
            <div className="bg-[#151515] border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score de Segurança</div>
                <div className={cn("text-3xl font-bold", scoreColor(auditResult.score))}>
                  {auditResult.score}<span className="text-base text-gray-500">/100</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{auditResult.classificationLabel}</div>
              </div>
              <div className="flex flex-col gap-1 items-end text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />{auditResult.counts.CRITICO} crítico</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />{auditResult.counts.ALTO} alto</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />{auditResult.counts.MEDIO} médio</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onRunAudit}
                disabled={isAuditing}
                className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Reauditar
              </button>
              <button
                onClick={onDownloadBlueprint}
                disabled={isGeneratingBlueprint}
                className="flex-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg px-3 py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGeneratingBlueprint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Gerar Blueprint
              </button>
            </div>

            {/* Findings list */}
            {auditResult.findings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center py-8 text-green-400">
                <ShieldCheck className="w-8 h-8" />
                <p className="text-sm">Nenhuma vulnerabilidade encontrada no código analisado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditResult.findings.map((f, i) => {
                  const style = SEVERITY_STYLES[f.severity];
                  return (
                    <div key={i} className="bg-[#151515] border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", style.badge)}>
                          {style.label} · {f.rule}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[45%]" title={f.location}>{f.location}</span>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">{f.description}</p>
                      {f.evidence && (
                        <pre className="text-[10px] bg-[#0a0a0a] border border-white/5 rounded p-2 overflow-x-auto text-gray-400 whitespace-pre-wrap break-words">
                          {f.evidence}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
