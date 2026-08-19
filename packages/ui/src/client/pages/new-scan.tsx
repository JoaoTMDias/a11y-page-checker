import { FileText, Globe2, Network, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { CreateScanRequest } from "@shared/contracts";

type Kind = "crawl" | "sitemap" | "markdown";

export default function NewScanPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>("crawl");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("scan-plan.md");
  const [maxDepth, setMaxDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(25);
  const [maxConcurrency, setMaxConcurrency] = useState(2);
  const [pending, setPending] = useState<CreateScanRequest>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const buildInput = (confirmed = false): CreateScanRequest => kind === "markdown"
    ? { kind, content, fileName, privateNetworkConfirmed: confirmed }
    : kind === "crawl" ? { kind, url, maxDepth, maxPages, maxConcurrency, privateNetworkConfirmed: confirmed }
    : { kind, url, maxConcurrency, privateNetworkConfirmed: confirmed };

  async function submit(input: CreateScanRequest) {
    setSubmitting(true); setError("");
    try { const scan = await api.create(input); navigate(`/scans/${scan.id}`); }
    catch (caught) {
      const typed = caught as Error & { code?: string };
      if (typed.code === "PRIVATE_NETWORK_CONFIRMATION_REQUIRED") setPending(buildInput(true));
      else setError(typed.message);
    } finally { setSubmitting(false); }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void submit(buildInput()); }
  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > 512_000) { setError("O plano Markdown não pode exceder 500 KB."); return; }
    setFileName(file.name); setContent(await file.text());
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="space-y-2"><p className="text-sm font-medium text-primary">Auditoria local</p><h1 className="text-3xl font-semibold tracking-tight">Novo scan de acessibilidade</h1><p className="max-w-2xl text-muted-foreground">Escolhe uma origem e acompanha cada página enquanto Playwright e axe-core executam localmente.</p></div>
    {error && <Alert variant="destructive"><AlertTitle>Não foi possível criar o scan</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle>Origem do scan</CardTitle><CardDescription>Usa apenas sites que possuis ou tens autorização para testar.</CardDescription></CardHeader><CardContent>
      <form onSubmit={onSubmit} className="space-y-6">
        <Tabs value={kind} onValueChange={(value) => setKind(value as Kind)}>
          <TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="crawl"><Globe2 />Crawl</TabsTrigger><TabsTrigger value="sitemap"><Network />Sitemap</TabsTrigger><TabsTrigger value="markdown"><FileText />Markdown</TabsTrigger></TabsList>
          <TabsContent value="crawl" className="space-y-5 pt-4"><Field id="crawl-url" label="URL inicial"><Input id="crawl-url" type="url" required placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-3"><NumberField id="depth" label="Profundidade" value={maxDepth} min={0} max={10} onChange={setMaxDepth} /><NumberField id="pages" label="Máximo de páginas" value={maxPages} min={1} max={500} onChange={setMaxPages} /><NumberField id="concurrency" label="Concorrência" value={maxConcurrency} min={1} max={8} onChange={setMaxConcurrency} /></div></TabsContent>
          <TabsContent value="sitemap" className="space-y-5 pt-4"><Field id="sitemap-url" label="URL do sitemap"><Input id="sitemap-url" type="url" required placeholder="https://example.com/sitemap.xml" value={url} onChange={(e) => setUrl(e.target.value)} /></Field><NumberField id="sitemap-concurrency" label="Concorrência" value={maxConcurrency} min={1} max={8} onChange={setMaxConcurrency} /></TabsContent>
          <TabsContent value="markdown" className="space-y-5 pt-4"><Field id="plan-file" label="Importar plano"><Input id="plan-file" type="file" accept=".md,text/markdown" onChange={(e) => void loadFile(e.target.files?.[0])} /></Field><Field id="plan-content" label="Conteúdo Markdown"><Textarea id="plan-content" required rows={12} value={content} onChange={(e) => setContent(e.target.value)} placeholder="- [ ] Home: https://example.com" /></Field></TabsContent>
        </Tabs>
        <div className="flex items-center justify-between gap-4 border-t pt-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck />Execução apenas nesta máquina</div><Button type="submit" disabled={submitting}>{submitting ? "A criar…" : "Iniciar scan"}</Button></div>
      </form>
    </CardContent></Card>
    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(undefined)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar alvo de rede privada</AlertDialogTitle><AlertDialogDescription>Este endereço parece pertencer à rede local. Confirma que tens autorização para gerar tráfego e executar uma auditoria neste alvo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => pending && void submit(pending)}>Confirmo que tenho autorização</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>; }
function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange(value: number): void }) { return <Field id={id} label={label}><Input id={id} type="number" required value={value} min={min} max={max} onChange={(e) => onChange(e.target.valueAsNumber)} /></Field>; }
