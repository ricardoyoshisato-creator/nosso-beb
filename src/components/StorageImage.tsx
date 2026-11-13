import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import { createSignedFileUrl } from "@/lib/attachments";
import type { AttachmentBucket } from "@/lib/attachments";
import { cn } from "@/lib/utils";

type StorageImageProps = {
  bucket: AttachmentBucket;
  path: string;
  alt: string;
  className?: string;
};

/** Miniatura de um arquivo do bucket privado, aberta por URL assinada temporária. */
export function StorageImage({ bucket, path, alt, className }: StorageImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);

    void createSignedFileUrl(bucket, path).then(({ url: signedUrl }) => {
      if (!active) return;
      if (signedUrl) setUrl(signedUrl);
      else setFailed(true);
    });

    return () => {
      active = false;
    };
  }, [bucket, path]);

  if (failed) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }

  if (!url) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
