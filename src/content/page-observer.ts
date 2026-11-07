export type PageChangeCallback = (changeType: 'NAVIGATION' | 'TAB_CHANGE' | 'EDITOR_MOUNT') => void;

export class PageObserver {
  private observer: MutationObserver | null = null;
  private lastUrl: string = window.location.href;
  private lastIdePresent: boolean = false;
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
    // Check URL change (SPA navigation often uses pushState without popstate)
    if (window.location.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.callback('NAVIGATION');
      return;
    }

    // Check IDE container presence
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
    window.removeEventListener('popstate', this.handleNavigation);
    if (this.throttleTimer !== null) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }
}

