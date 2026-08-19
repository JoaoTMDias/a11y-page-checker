import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { ScanListResponse, StoredScan } from "@shared/contracts";

export default function HistoryPage() {
  const [data, setData] = useState<ScanListResponse>();
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  async function load() { try { setData(await api.list(status === "all" ? undefined : status)); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { void load(); }, [status]);
  async function remove(scan: StoredScan) { try { await api.remove(scan.id); await load(); } catch (e) { setError((e as Error).message); } }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Histórico</h1><p className="mt-2 text-muted-foreground">Execuções guardadas nesta máquina.</p></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem><SelectItem value="queued">Em fila</SelectItem><SelectItem value="running">Em execução</SelectItem><SelectItem value="completed">Concluídos</SelectItem><SelectItem value="failed">Falhados</SelectItem></SelectContent></Select></div>
    {error && <Alert variant="destructive"><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle>Scans recentes</CardTitle><CardDescription>{data ? `${data.total} execuções` : "A carregar…"}</CardDescription></CardHeader><CardContent>
      {!data ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : data.items.length === 0 ? <div className="py-12 text-center"><p className="font-medium">Ainda não existem scans</p><Button asChild className="mt-4"><Link to="/">Novo scan</Link></Button></div> :
      <Table><TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Estado</TableHead><TableHead>Criado</TableHead><TableHead className="text-right">Findings</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader><TableBody>{data.items.map((scan) => <TableRow key={scan.id}><TableCell className="max-w-xs truncate font-medium">{scan.input.kind === "markdown" ? scan.input.fileName : scan.input.url}</TableCell><TableCell><Badge variant={scan.status === "failed" ? "destructive" : scan.status === "completed" ? "secondary" : "outline"}>{label(scan.status)}</Badge></TableCell><TableCell>{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(scan.createdAt))}</TableCell><TableCell className="text-right font-mono">{scan.result?.summary.totalFindings ?? scan.progress.findings}</TableCell><TableCell><div className="flex justify-end gap-1"><Button asChild variant="ghost" size="icon" aria-label="Abrir scan"><Link to={`/scans/${scan.id}`}><ExternalLink /></Link></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Apagar scan" disabled={scan.status === "queued" || scan.status === "running"}><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apagar esta execução?</AlertDialogTitle><AlertDialogDescription>O resultado será removido do histórico local.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void remove(scan)}>Apagar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>;
}
function label(status: StoredScan["status"]) { return { queued: "Em fila", running: "Em execução", completed: "Concluído", failed: "Falhado" }[status]; }
