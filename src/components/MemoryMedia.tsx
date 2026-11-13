import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import { MEMORY_BUCKET, createSignedFileUrl } from "@/lib/attachments";
import { memoryMediaKind } from "@/lib/memories";
import { cn } from "@/lib/utils";

type MemoryMediaProps = {
  path: string;
  alt: string;
  className?: string;
  /** Vídeos da linha do tempo podem abrir sem os controles (só a prévia). */
  videoControls?: boolean;
};

/**
 * Foto ou vídeo da memória aberto por URL assinada temporária (bucket privado
 * `memories`). O tipo vem da extensão do caminho salvo no banco.
 */
export function MemoryMedia({ path, alt, className, videoControls = true }: MemoryMediaProps) {
  const kind = memoryMediaKind(path);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);

    void createSignedFileUrl(MEMORY_BUCKET, path).then(({ url: signedUrl }) => {
      if (!active) return;
      if (signedUrl) setUrl(signedUrl);
      else setFailed(true);
    });

    return () => {
      active = false;
    };
  }, [path]);

  if (failed) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  if (!url) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }

  if (kind === "video") {
    return (
      <video
        src={url}
        className={className}
        controls={videoControls}
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
