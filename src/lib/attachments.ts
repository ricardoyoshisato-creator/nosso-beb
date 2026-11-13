import { supabase } from "@/lib/supabase";

/** Buckets privados — os arquivos só são acessíveis por URLs assinadas. */
export const APPOINTMENT_BUCKET = "appointments";
export const EXAM_BUCKET = "exams";
export const PRESCRIPTION_BUCKET = "prescriptions";
export const RECEIPT_BUCKET = "receipts";
export const GIFT_BUCKET = "gifts";
export const BABY_BUCKET = "baby";
export const VACCINE_BUCKET = "vaccines";
export const DOCUMENT_BUCKET = "documents";
export const MEMORY_BUCKET = "memories";

export type AttachmentBucket =
  | typeof APPOINTMENT_BUCKET
  | typeof EXAM_BUCKET
  | typeof PRESCRIPTION_BUCKET
  | typeof RECEIPT_BUCKET
  | typeof GIFT_BUCKET
  | typeof BABY_BUCKET
  | typeof VACCINE_BUCKET
  | typeof DOCUMENT_BUCKET
  | typeof MEMORY_BUCKET;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ACCEPTED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ACCEPTED_ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function validateAttachment(file: File) {
  if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
    return `“${file.name}”: envie imagens (JPG, PNG, WEBP) ou PDF.`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `“${file.name}” passa de 10 MB.`;
  }
  return null;
}

/** Nome seguro para o caminho no storage (sem acentos, espaços ou caracteres especiais). */
export function safeStorageFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export async function createSignedFileUrl(bucket: AttachmentBucket, storagePath: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 300);

  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? "Não foi possível abrir o arquivo." };
  }

  return { url: data.signedUrl, error: null };
}

/** Baixa/abre um anexo a partir de uma URL assinada temporária. */
export async function downloadStoredFile(
  bucket: AttachmentBucket,
  storagePath: string,
  fileName: string,
) {
  const { url, error } = await createSignedFileUrl(bucket, storagePath);
  if (!url) return { error };

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  return { error: null };
}
