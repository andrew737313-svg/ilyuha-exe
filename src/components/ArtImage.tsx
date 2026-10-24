import { useState, type CSSProperties, type ReactNode } from "react";
import type { ArtAsset } from "../game/art";

type ArtImageProps = {
  asset: ArtAsset;
  className?: string;
  priority?: boolean;
  /** Rendered inside the frame, under the image (caption is real HTML text). */
  caption?: ReactNode;
  /** Optional override to crop the art for a tighter composition. */
  ratio?: string;
  dim?: boolean;
};

export function ArtImage({
  asset,
  className = "",
  priority = false,
  caption,
  ratio,
  dim = false,
}: ArtImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const style = {
    "--ar": ratio ?? `${asset.width} / ${asset.height}`,
  } as CSSProperties;

  return (
    <figure className={`art ${dim ? "art--dim" : ""} ${className}`.trim()}>
      <div className="art__frame" style={style}>
        {failed ? (
          <div className="art__fallback" role="img" aria-label={asset.alt}>
            <span className="art__fallback-glyph" aria-hidden="true">
              ▚
            </span>
            <span>Иллюстрация не загрузилась</span>
            <code>{asset.src}</code>
          </div>
        ) : (
          <img
            src={asset.src}
            alt={asset.alt}
            width={asset.width}
            height={asset.height}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            style={{ objectPosition: asset.focus }}
            className={loaded ? "is-loaded" : ""}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            draggable={false}
          />
        )}
        <span className="art__corners" aria-hidden="true" />
        {!loaded && !failed ? <span className="art__scan" aria-hidden="true" /> : null}
      </div>
      {caption ? <figcaption className="art__caption">{caption}</figcaption> : null}
    </figure>
  );
}