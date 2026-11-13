import { useState } from "react";
import { CalendarHeart, Home, Loader2, Plus } from "lucide-react";

import { FamilyEmptyArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";

export function CreateFamilyCard() {
  const { createFamily } = useFamily();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [babyName, setBabyName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Informe o nome da família.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const { error } = await createFamily({
      name,
      city,
      babyName,
      babyDueDate: dueDate,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    setName("");
    setCity("");
    setBabyName("");
    setDueDate("");
    toast({
      title: "Família criada!",
      description: "Agora convide quem vai acompanhar a chegada do bebê.",
    });
  };

  return (
    <div className="animate-rise mx-auto w-full max-w-2xl rounded-4xl border border-border/70 bg-card p-6 shadow-float sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Home className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
          Vamos criar a sua família
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          A família é o espaço onde os registros do bebê ficam guardados e compartilhados com quem
          você confia. Você pode ajustar tudo depois.
        </p>
      </div>

      <FamilyEmptyArt className="mx-auto mt-4 h-auto w-full max-w-[220px]" />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="family-name" className="text-xs font-semibold text-foreground/80">
            Nome da família *
          </Label>
          <Input
            id="family-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Família Almeida"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="family-city" className="text-xs font-semibold text-foreground/80">
              Cidade
            </Label>
            <Input
              id="family-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="São Paulo, SP"
              className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baby-name" className="text-xs font-semibold text-foreground/80">
              Nome do bebê
            </Label>
            <Input
              id="baby-name"
              value={babyName}
              onChange={(event) => setBabyName(event.target.value)}
              placeholder="Clara"
              className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baby-due" className="text-xs font-semibold text-foreground/80">
            Data prevista do parto
          </Label>
          <div className="relative">
            <CalendarHeart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="baby-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="h-11 rounded-2xl border-border bg-background pl-11 text-sm focus-visible:ring-primary/40"
            />
          </div>
        </div>

        {formError && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-2xl text-sm font-semibold shadow-soft"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar família
        </Button>
      </form>
    </div>
  );
}
