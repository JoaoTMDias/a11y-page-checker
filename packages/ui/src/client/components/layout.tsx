import { History, Menu, Moon, Plus, ScanSearch, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const links = [{ to: "/", label: "Novo scan", icon: Plus }, { to: "/history", label: "Histórico", icon: History }];

function Navigation() {
  return <nav aria-label="Navegação principal" className="flex gap-1 max-md:flex-col">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"}`}><Icon aria-hidden="true" />{label}</NavLink>)}</nav>;
}

export function Layout() {
  const [theme, setTheme] = useState(() => localStorage.getItem("a11y-theme") ?? "system");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
    apply(); media.addEventListener("change", apply); localStorage.setItem("a11y-theme", theme);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return <div className="min-h-dvh bg-background text-foreground">
    <a className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main">Saltar para o conteúdo</a>
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <Link to="/" className="flex items-center gap-3 rounded-md font-semibold"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><ScanSearch aria-hidden="true" /></span><span>A11y Page Checker</span></Link>
      <div className="flex items-center gap-2"><Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Alternar tema" onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}>{theme === "dark" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</Button></TooltipTrigger><TooltipContent>Alternar tema</TooltipContent></Tooltip><div className="hidden md:block"><Navigation /></div><div className="md:hidden"><Sheet><SheetTrigger asChild><Button size="icon" variant="outline" aria-label="Abrir navegação"><Menu aria-hidden="true" /></Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Navegação</SheetTitle></SheetHeader><div className="mt-6"><Navigation /></div></SheetContent></Sheet></div></div>
    </div></header>
    <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6"><Outlet /></main>
  </div>;
}
