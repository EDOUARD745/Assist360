import KpiRow from "@/components/KpiRow";
import TicketList from "@/components/TicketList";

export default function Home() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour Marie 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voici la file d'attente du jour. Les tickets sont triés par urgence et déjà pré-analysés par l'IA.
          </p>
        </div>
        <div className="text-xs text-muted-foreground/70">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </header>
      <KpiRow />
      <TicketList />
    </div>
  );
}
