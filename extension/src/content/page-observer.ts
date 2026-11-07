export type PageChangeCallback = (changeType: 'NAVIGATION' | 'TAB_CHANGE' | 'EDITOR_MOUNT') => void;

export class PageObserver {
  private observer: MutationObserver | null = null;
  private intervalId: number | null = null;
  private lastUrl: string = window.location.href;
  private lastIdePresent: boolean = false;
  private lastTitle: string = '';
  private callback: PageChangeCallback;
  private throttleTimer: number | null = null;

  constructor(callback: PageChangeCallback) {
    this.callback = callback;
    this.lastIdePresent = !!document.querySelector('#submit-ide-v2');
  }

  public start(): void {
    if (this.observer) return;

    // Listen to History API navigation (pushState / popstate)
    window.addEventListener('popstate', this.handleNavigation);

    this.observer = new MutationObserver(() => {
      this.throttleCheck();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fallback interval to guarantee detection across all SPA router frameworks
    this.intervalId = window.setInterval(() => {
      this.checkChanges();
    }, 800);
  }

  private handleNavigation = (): void => {
    if (window.location.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.callback('NAVIGATION');
    }
  };

  private throttleCheck(): void {
    if (this.throttleTimer !== null) return;

    this.throttleTimer = window.setTimeout(() => {
      this.throttleTimer = null;
      this.checkChanges();
    }, 250);
  }

  private checkChanges(): void {
    // 1. Check URL change (SPA navigation uses pushState without popstate)
    if (window.location.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.callback('NAVIGATION');
      return;
    }

    // 2. Check problem title changes in DOM
    const titleEl = document.querySelector('h1, h2, ._title_bh3c4_14, [class*="problem-title"]');
    const currentTitle = titleEl?.textContent?.trim() || '';
    if (currentTitle && this.lastTitle && currentTitle !== this.lastTitle) {
      this.lastTitle = currentTitle;
      this.callback('NAVIGATION');
      return;
    }
    if (currentTitle && !this.lastTitle) {
      this.lastTitle = currentTitle;
    }

    // 3. Check IDE container presence
    const currentIdePresent = !!document.querySelector('#submit-ide-v2');
    if (currentIdePresent !== this.lastIdePresent) {
      this.lastIdePresent = currentIdePresent;
      this.callback(currentIdePresent ? 'EDITOR_MOUNT' : 'TAB_CHANGE');
    }
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener('popstate', this.handleNavigation);
    if (this.throttleTimer !== null) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }
}
