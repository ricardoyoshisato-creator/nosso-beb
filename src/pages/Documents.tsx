import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  FolderLock,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { DocumentForm } from "@/components/DocumentForm";
import type { DocumentFormValues } from "@/components/DocumentForm";
import { PageHeader } from "@/components/PageHeader";
import { StorageImage } from "@/components/StorageImage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import {
  DOCUMENT_BUCKET,
  createSignedFileUrl,
  downloadStoredFile,
} from "@/lib/attachments";
import {
  documentCategoryCounts,
  documentCategoryMeta,
  documentCategoryMetaOf,
  documentFileExtension,
  documentFileKind,
  documentFileName,
  filterDocuments,
  sortDocuments,
} from "@/lib/documents";
import type { DocumentCategoryFilter } from "@/lib/documents";
import { formatNumericDate } from "@/lib/family";
import { cn } from "@/lib/utils";
import type { DocumentRecord } from "@/types/database";

const fileKindIcon = {
  pdf: FileText,
  image: FileImage,
  other: File,
} as const;

const Documents = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { family, loading, documents, can, saveDocument, deleteDocument } = useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategoryFilter>("all");
  const [documentToRemove, setDocumentToRemove] = useState<DocumentRecord | null>(null);
  const [removing, setRemoving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const canCreate = can("records.create");
  const canEditRecords = can("records.edit");
  const canDeleteAny = can("records.delete");

  const sorted = useMemo(() => sortDocuments(documents), [documents]);
  const visible = useMemo(
    () => filterDocuments(sorted, query, category),
    [sorted, query, category],
  );
  const counts = useMemo(() => documentCategoryCounts(documents), [documents]);

  const pdfCount = documents.filter((item) => documentFileKind(item.file_path) === "pdf").length;
  const imageCount = documents.filter(
    (item) => documentFileKind(item.file_path) === "image",
  ).length;
  const hasFilters = query.trim().length > 0 || category !== "all";

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (doc: DocumentRecord) => {
    setEditing(doc);
    setFormOpen(true);
  };

  const handleSave = async (values: DocumentFormValues) => {
    setSaving(true);
    const { error } = await saveDocument(
      {
        name: values.name,
        category: values.category,
        date: values.date,
        description: values.description,
        file: values.file,
      },
      editing ?? undefined,
    );
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setFormOpen(false);
    setEditing(null);
    toast({
      title: editing ? "Documento atualizado" : "Documento enviado",
      description: editing
        ? "Os dados e o arquivo do documento já foram atualizados."
        : "Ele já aparece na central de documentos da família.",
    });
  };

  const handleDelete = async () => {
    if (!documentToRemove) return;

    setRemoving(true);
    const { error } = await deleteDocument(documentToRemove);
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    setDocumentToRemove(null);
    toast({ title: "Documento removido", description: "O arquivo saiu do armazenamento da família." });
  };

  const handleOpen = async (doc: DocumentRecord, download = false) => {
    setOpeningId(doc.id);

    if (download) {
      const { error } = await downloadStoredFile(
        DOCUMENT_BUCKET,
        doc.file_path,
        documentFileName(doc.file_path) || doc.name,
      );
      setOpeningId(null);

      if (error) {
        toast({ variant: "destructive", title: "Não foi possível baixar", description: error });
      }
      return;
    }

    const { url, error } = await createSignedFileUrl(DOCUMENT_BUCKET, doc.file_path);
    setOpeningId(null);

    if (!url) {
      toast({
        variant: "destructive",
        title: "Não foi possível abrir",
        description: error ?? "Tente novamente em instantes.",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Abrindo a central de documentos…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Documentos"
        title="Central de documentos"
        description="Carteirinhas, exames, laudos e papéis importantes do bebê — guardados em um só lugar, só para a família."
        action={
          canCreate ? (
            <Button
              onClick={openNew}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo documento
            </Button>
          ) : undefined
        }
      />

      {/* Resumo */}
      <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/35" />
        <div className="pointer-events-none absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-lavender/25" />

        <div className="relative flex items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              <FolderLock className="h-3 w-3" />
              Arquivos privados
            </span>
            <p className="mt-3 font-display text-3xl font-semibold leading-none">
              {documents.length}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-primary-foreground/80">
              {documents.length === 1 ? "documento guardado" : "documentos guardados"} · abertos
              apenas por URL assinada
            </p>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <span className="rounded-2xl bg-card/15 px-2.5 py-1.5 text-center text-[10px] font-semibold backdrop-blur">
              <span className="block font-display text-base leading-tight">{pdfCount}</span>
              PDFs
            </span>
            <span className="rounded-2xl bg-card/15 px-2.5 py-1.5 text-center text-[10px] font-semibold backdrop-blur">
              <span className="block font-display text-base leading-tight">{imageCount}</span>
              imagens
            </span>
          </div>
        </div>
      </section>

      {/* Busca e filtro */}
      <section className="animate-rise space-y-2.5" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pelo nome do documento…"
              aria-label="Buscar documento pelo nome"
              className="h-11 rounded-2xl border-border bg-card pl-10 text-sm focus-visible:ring-primary/40"
            />
          </div>

          <Select
            value={category}
            onValueChange={(value) => setCategory(value as DocumentCategoryFilter)}
          >
            <SelectTrigger
              className="h-11 w-full rounded-2xl border-border bg-card text-sm sm:w-56"
              aria-label="Filtrar por categoria"
            >
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">
                Todas as categorias{documents.length > 0 ? ` (${documents.length})` : ""}
              </SelectItem>
              {documentCategoryMeta.map((meta) => (
                <SelectItem key={meta.key} value={meta.key}>
                  {meta.label}
                  {counts[meta.key] ? ` (${counts[meta.key]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!canCreate && (
          <p className="rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
            Seu papel permite consultar os documentos. Peça a um cuidador ou administrador para
            enviar novos arquivos.
          </p>
        )}
      </section>

      {/* Lista */}
      {visible.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((doc, index) => {
            const meta = documentCategoryMetaOf(doc.category);
            const kind = documentFileKind(doc.file_path);
            const KindIcon = fileKindIcon[kind];
            const canRemove = canDeleteAny || doc.created_by === user?.id;
            const busy = openingId === doc.id;

            return (
              <li
                key={doc.id}
                className="animate-rise flex flex-col rounded-3xl border border-border/70 bg-card p-3.5 shadow-soft"
                style={{ animationDelay: `${80 + Math.min(index, 6) * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  {kind === "image" ? (
                    <StorageImage
                      bucket={DOCUMENT_BUCKET}
                      path={doc.file_path}
                      alt={`Miniatura de ${doc.name}`}
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "grid h-14 w-14 shrink-0 place-items-center rounded-2xl",
                        meta.chip,
                      )}
                      aria-hidden="true"
                    >
                      <KindIcon className="h-5 w-5" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {doc.name}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          meta.chip,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-muted-foreground">
                      <span>{formatNumericDate(doc.date)}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <KindIcon className="h-3 w-3" />
                        {documentFileExtension(doc.file_path)}
                      </span>
                    </p>

                    {doc.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/90">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => void handleOpen(doc)}
                    disabled={busy}
                    className="h-9 rounded-2xl px-3 text-xs font-semibold shadow-soft"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Visualizar
                  </Button>

                  <button
                    type="button"
                    onClick={() => void handleOpen(doc, true)}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-1 rounded-2xl border border-border/70 bg-background px-3 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>

                  {canEditRecords && (
                    <button
                      type="button"
                      onClick={() => openEdit(doc)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  )}

                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => setDocumentToRemove(doc)}
                      aria-label={`Remover ${doc.name}`}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          {hasFilters ? (
            <>
              <Search className="h-7 w-7 text-primary" />
              <p className="mt-2 font-display text-base font-semibold text-foreground">
                Nenhum documento encontrado
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Ajuste a busca ou o filtro de categoria para ver outros arquivos da família.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
              >
                Limpar filtros
              </Button>
            </>
          ) : (
            <>
              <FolderOpen className="h-7 w-7 text-primary" />
              <p className="mt-2 font-display text-base font-semibold text-foreground">
                Nenhum documento ainda
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Guarde a carteirinha de vacinas, os exames e os papéis do bebê em um lugar só — e
                encontre tudo pela busca quando precisar.
              </p>
              {canCreate && (
                <Button
                  onClick={openNew}
                  variant="outline"
                  className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Enviar primeiro documento
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Editar documento" : "Novo documento"}
            </DialogTitle>
            <DialogDescription>
              Envie um PDF ou imagem e classifique o documento para encontrar depois.
            </DialogDescription>
          </DialogHeader>

          <DocumentForm
            document={editing}
            submitting={saving}
            onSubmit={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(documentToRemove)}
        onOpenChange={(open) => !open && setDocumentToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remover “{documentToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo sai do armazenamento da família e o registro desaparece da central. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter documento</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={handleDelete}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Links de visualização valem por 5 minutos e são gerados na hora — nenhum arquivo fica
        público.
      </p>
    </div>
  );
};

export default Documents;
