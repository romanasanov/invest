import type { FormatId } from "@/lib/brand-content";

export function BrandLogo({ format, className = "", decorative = false }: { format?: FormatId; className?: string; decorative?: boolean }) {
  return <img className={`m-brand-logo ${className}`} src={format ? `/assets/logo-${format}.svg` : "/assets/logo-wordmark.svg"} alt={decorative ? "" : "Киомей"} />;
}

export function Arrow({ diagonal = false, className = "" }: { diagonal?: boolean; className?: string }) {
  return <svg className={`m-arrow ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
