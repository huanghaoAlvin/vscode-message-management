import { isEmpty } from "lodash";
import * as vscode from "vscode";

interface RequestMessage {
  sid: string;
  event: string;
  data: any;
}

interface ResponseMessage {
  sid: string;
  data: any;
}

interface Message {
  sid: string;
  event?: string;
  data: any;
}

interface Options {
  timeout?: number;
  cacheRequestIfWebviewIsUnbind?: boolean;
}

export class Messenger {
  private webview?: vscode.Webview;
  private options: Options;
  private eventListeners: Record<string, (data: any) => Promise<any> | any> =
    {};
  private cachedRequests: ((webview: vscode.Webview) => void)[] = [];
  private pendingRequests: Record<string, (data: any) => any> = {};
  private sid: number = 0;

  constructor(options: Options = {}) {
    const defaultOptions: Options = {
      cacheRequestIfWebviewIsUnbind: true,
    };
    this.options = { ...defaultOptions, ...options };
  }

  public bindWebview(webview: vscode.Webview) {
    this.webview = webview;
    this.listenMessage();

    if (!isEmpty(this.cachedRequests)) {
      this.cachedRequests.forEach((work) => work(webview));
      this.cachedRequests = [];
    }
  }

  private listenMessage() {
    this.webview?.onDidReceiveMessage(async ({ sid, event, data }: Message) => {
      if (!sid) return;

      // request from webview
      if (event) {
        const listener = this.eventListeners[event];
        if (!listener) return;

        const response = await listener(data);
        const responseMessage: ResponseMessage = { sid, data: response };
        this.webview?.postMessage(responseMessage);
        return;
      }

      // response from webview
      const pendingRequest = this.pendingRequests[sid];
      if (!pendingRequest) return;
      pendingRequest(data);
    });
  }

  private getSid() {
    return `${this.sid++}`;
  }

  public async request<Request, Response>(
    event: string,
    data: Request
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const sid = this.getSid();
      const message: RequestMessage = { sid, event, data };
      this.pendingRequests[sid] = resolve;

      const requestWork = (webview: vscode.Webview) => {
        webview.postMessage(message);
        if (this.options.timeout) {
          setTimeout(() => reject("timeout"), this.options.timeout);
        }
      };

      if (this.webview) {
        requestWork(this.webview);
        return;
      }

      if (this.options.cacheRequestIfWebviewIsUnbind) {
        this.cachedRequests.push(requestWork);
      }
    });
  }

  public bind<Request, Response>(
    event: string,
    callback: (data: Request) => Promise<Response> | Response
  ) {
    this.eventListeners[event] = callback;
  }
}
