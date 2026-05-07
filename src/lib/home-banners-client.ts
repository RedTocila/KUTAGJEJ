export interface HomeBannerDto {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  order: number;
}

function apiBase(): string {
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  return (fromServer && fromServer.trim()) || (fromPublic && fromPublic.trim()) || 'http://localhost:5000';
}

async function safeJson<T>(path: string): Promise<T | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
  try {
    const res = await fetch(`${apiBase()}/api${path}`, {
      next: { revalidate: 60 },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchHomeBanners(): Promise<HomeBannerDto[]> {
  const data = await safeJson<{ banners: HomeBannerDto[] }>('/public/home-banners');
  return data?.banners ?? [];
}
