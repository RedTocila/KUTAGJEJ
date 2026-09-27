import { installPopStateViewTransition, onNavTransitionStart } from '@/lib/nav-transition';

installPopStateViewTransition();

export function onRouterTransitionStart(href: string, navigationType: 'push' | 'replace' | 'traverse'): void {
  onNavTransitionStart(href, navigationType);
}
