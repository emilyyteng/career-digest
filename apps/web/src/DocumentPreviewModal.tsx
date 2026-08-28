import { useEffect } from "react";

type Props = {
  url: string;
  title: string;
  mimeType: string | null;
  onClose: () => void;
};

function canEmbedInline(mimeType: string | null, title: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  const lower = title.toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) return true;
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("text/")) return true;
  return false;
}

export default function DocumentPreviewModal({ url, title, mimeType, onClose }: Props) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const embed = canEmbedInline(mimeType, title);
  const isImage = mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(title);

  return (
    <div
      className="modal-backdrop document-preview-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal document-preview-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="document-preview-header">
          <h3 className="document-preview-title">{title}</h3>
          <div className="document-preview-actions">
            <a className="secondary" href={url.split("?")[0]} target="_blank" rel="noreferrer">
              Open in tab<span className="ext-icon" aria-hidden="true">↗</span>
            </a>
            <button type="button" className="secondary" onClick={onClose}>Close</button>
          </div>
        </div>
        {embed ? (
          isImage ? (
            <img className="document-preview-image" src={url} alt={title} />
          ) : (
            <iframe className="document-preview-frame" src={url} title={title} />
          )
        ) : (
          <p className="muted document-preview-fallback">
            This file type can’t be previewed in the browser.{" "}
            <a href={url.replace("?view=1", "")}>Download instead</a>.
          </p>
        )}
      </div>
    </div>
  );
}
