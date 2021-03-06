import { BrowserBackend, BrowserOptions } from '@sentry/browser';
import { BaseBackend } from '@sentry/core';
import { Scope } from '@sentry/hub';
import { Breadcrumb, SentryEvent, SentryEventHint, SentryResponse, Severity, Status } from '@sentry/types';

const PLUGIN_NAME = 'Sentry';

declare var window: any;
declare var document: any;

/**
 * Configuration options for the Sentry Cordova SDK.
 * @see CordovaFrontend for more information.
 */
export interface CordovaOptions extends BrowserOptions {}

/** The Sentry Cordova SDK Backend. */
export class CordovaBackend extends BaseBackend<BrowserOptions> {
  private browserBackend: BrowserBackend;

  private deviceReadyCallback: any;

  /** Creates a new cordova backend instance. */
  public constructor(options: CordovaOptions = {}) {
    super(options);
    this.browserBackend = new BrowserBackend(options);
  }

  /**
   * @inheritDoc
   */
  public install(): boolean {
    this.browserBackend.install();

    if (this.isCordova()) {
      this.deviceReadyCallback = () => this.runNativeInstall();
      document.addEventListener('deviceready', this.deviceReadyCallback);
    }

    return true;
  }

  /**
   * @inheritDoc
   */
  public async eventFromException(exception: any, hint?: SentryEventHint): Promise<SentryEvent> {
    return this.browserBackend.eventFromException(exception, hint);
  }

  /**
   * @inheritDoc
   */
  public async eventFromMessage(
    message: string,
    level: Severity = Severity.Info,
    hint?: SentryEventHint
  ): Promise<SentryEvent> {
    return this.browserBackend.eventFromMessage(message, level, hint);
  }

  /**
   * @inheritDoc
   */
  public async sendEvent(event: SentryEvent): Promise<SentryResponse> {
    try {
      await this.nativeCall('sendEvent', event);
      // Otherwise this is from native response
      return { status: Status.Success };
    } catch (e) {
      return this.browserBackend.sendEvent(event);
    }
  }

  // CORDOVA --------------------
  public nativeCall(action: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const exec = window && (window as any).Cordova && (window as any).Cordova.exec;
      if (!exec) {
        reject('Cordova.exec not available');
      } else {
        (window as any).Cordova.exec(resolve, reject, PLUGIN_NAME, action, args);
      }
    });
  }

  private runNativeInstall(): void {
    document.removeEventListener('deviceready', this.deviceReadyCallback);
    if (this.options.dsn && this.options.enabled !== false) {
      this.nativeCall('install', this.options.dsn, this.options);
    }
  }

  private isCordova(): boolean {
    return window.cordova !== undefined || window.Cordova !== undefined;
  }

  /**
   * @inheritDoc
   */
  public storeBreadcrumb(breadcrumb: Breadcrumb): boolean {
    this.nativeCall('addBreadcrumb', breadcrumb).catch(() => {
      // We do nothing since all breadcrumbs are attached in the event.
      // This only applies to android.
    });
    return true;
  }

  /**
   * @inheritDoc
   */
  public storeScope(scope: Scope): void {
    this.nativeCall('setExtraContext', (scope as any).extra).catch(() => {
      // We do nothing since scope is handled and attached to the event.
      // This only applies to android.
    });
    this.nativeCall('setTagsContext', (scope as any).tags).catch(() => {
      // We do nothing since scope is handled and attached to the event.
      // This only applies to android.
    });
    this.nativeCall('setUserContext', (scope as any).user).catch(() => {
      // We do nothing since scope is handled and attached to the event.
      // This only applies to android.
    });
  }
}
