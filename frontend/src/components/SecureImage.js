import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const SecureImage = ({ fileId, alt, className, testId }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    api.get(`/files/${fileId}`, { responseType: "blob" }).then((r) => {
      url = URL.createObjectURL(r.data);
      setSrc(url);
    }).catch(() => setSrc(""));
    return () => url && URL.revokeObjectURL(url);
  }, [fileId]);
  if (src === null) return <div className={`animate-pulse bg-stone-100 ${className}`} />;
  if (!src) return <div className={`flex items-center justify-center bg-stone-100 text-xs text-stone-500 ${className}`}>Unavailable</div>;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      <img src={src} alt={alt} className={`object-cover ${className}`} data-testid={testId} />
    </a>
  );
};
