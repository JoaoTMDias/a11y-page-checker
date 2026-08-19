import { Download, ExternalLink, Filter } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { StoredScan } from "@shared/contracts";

export default function ScanDetailPage() {
  const { id = "" } = useParams();
  const [scan, setScan] = useState<StoredScan>();
  const [error, setError] = useState("");
  const [impact, setImpact] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let source: EventSource | undefined;
    api.get(id).then((value) => {
      setScan(value);
      if (value.status === "queued" || value.status === "running") {
        source = new EventSource(`/api/scans/${id}/events`);
        const update = (event: Event) => {
          const next = JSON.parse((event as MessageEvent).data) as StoredScan;
          setScan(next);
          if (next.status === "completed" || next.status === "failed") source?.close();
        };
        source.addEventListener("state", update); source.addEventListener("progress", update);
        source.onerror = () => setError("A ligação de progresso foi interrompida; o browser tentará restabelecê-la.");
      }
    }).catch((e: Error) => setError(e.message));
    return () => source?.close();
  }, [id]);

  const deferredQuery = useDeferredValue(query);
  const findings = useMemo(() => scan?.result?.urlResults.flatMap((page) => page.findings.map((finding) => ({ ...finding, url: page.url }))).filter((finding) => (impact === "all" || finding.impact === impact) && (!deferredQuery || `${finding.id} ${finding.help} ${finding.url}`.toLowerCase().includes(deferredQuery.toLowerCase()))) ?? [], [scan, impact, deferredQuery]);

  if (!scan && !error) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-40" /></div>;
  if (!scan) return <Alert variant="destructive"><AlertTitle>Não foi possível abrir o scan</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  const percentage = scan.status === "completed" ? 100 : scan.status === "running" ? 40 : 0;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><Badge variant={scan.status === "failed" ? "destructive" : scan.status === "completed" ? "secondary" : "outline"}>{scan.status}</Badge><h1 className="max-w-4xl break-words text-3xl font-semibold tracking-tight">{scan.input.kind === "markdown" ? scan.input.fileName : scan.input.url}</h1></div><div className="flex gap-2">{scan.result && <><Button asChild variant="outline"><a href={`/api/scans/${id}/download?format=json`}><Download />JSON</a></Button><Button asChild variant="outline"><a href={`/api/scans/${id}/download?format=html`}><Download />HTML</a></Button></>}<Button asChild><Link to="/">Novo scan</Link></Button></div></div>
    {error && <Alert><AlertTitle>Ligação a restabelecer</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {scan.error && <Alert variant="destructive"><AlertTitle>O scan falhou</AlertTitle><AlertDescription>{scan.error}</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle>Progresso</CardTitle><CardDescription aria-live="polite">{scan.progress.currentUrl ?? statusText(scan.status)}</CardDescription></CardHeader><CardContent><Progress value={percentage} aria-label="Progresso do scan" /><dl className="mt-5 grid grid-cols-3 gap-4"><Metric label="Páginas" value={scan.result?.summary.pagesScanned ?? scan.progress.completedPages} /><Metric label="Findings" value={scan.result?.summary.totalFindings ?? scan.progress.findings} /><Metric label="Duração" value={scan.result ? `${(scan.result.summary.duration / 1000).toFixed(1)}s` : "—"} /></dl></CardContent></Card>
    {scan.result && <section aria-labelledby="findings-title" className="space-y-4"><div><h2 id="findings-title" className="text-2xl font-semibold">Findings</h2><p className="text-muted-foreground">Filtra e inspeciona os problemas detetados.</p></div><div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row"><div className="relative flex-1"><Filter className="absolute left-3 top-2.5 text-muted-foreground" /><Input className="pl-9" aria-label="Pesquisar findings" placeholder="Regra, ajuda ou URL" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Select value={impact} onValueChange={setImpact}><SelectTrigger className="sm:w-48" aria-label="Filtrar por impacto"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os impactos</SelectItem><SelectItem value="critical">Crítico</SelectItem><SelectItem value="serious">Sério</SelectItem><SelectItem value="moderate">Moderado</SelectItem><SelectItem value="minor">Menor</SelectItem></SelectContent></Select></div>
      {findings.length === 0 ? <Card><CardContent className="py-12 text-center">Nenhum finding corresponde aos filtros.</CardContent></Card> : <div className="space-y-3">{findings.slice(0, 200).map((finding, index) => <Card className="finding-card" key={`${finding.url}-${finding.id}-${index}`}><CardHeader><div className="flex items-center gap-2"><Badge variant={finding.impact === "critical" || finding.impact === "serious" ? "destructive" : "outline"}>{finding.impact}</Badge><CardTitle className="text-base">{finding.help}</CardTitle></div><CardDescription className="break-all">{finding.url}</CardDescription></CardHeader><CardContent className="space-y-4"><p>{finding.description}</p>{finding.nodes.map((node, i) => <div key={i} className="space-y-2 rounded-md bg-muted p-3"><code className="block break-all text-xs">{node.target.join(" → ")}</code><pre className="overflow-x-auto whitespace-pre-wrap text-xs">{node.html}</pre>{node.failureSummary && <p className="text-sm text-muted-foreground">{node.failureSummary}</p>}</div>)}<Button asChild size="sm" variant="outline"><a href={finding.helpUrl} target="_blank" rel="noreferrer">Orientação da regra<ExternalLink /></a></Button></CardContent></Card>)}</div>}
    </section>}
  </div>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-xl font-semibold">{value}</dd></div>; }
function statusText(status: StoredScan["status"]) { return { queued: "À espera na fila", running: "A executar", completed: "Scan concluído", failed: "Scan interrompido" }[status]; }
