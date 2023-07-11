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
}

export class Messenger {
  private webview: vscode.Webview;
  private options: Options;
  private eventListeners: Record<string, (data: any) => Promise<any> | any> =
    {};
  private pendingRequests: Record<string, (data: any) => any> = {};
  private sid: number = 0;

  constructor(webview: vscode.Webview, options: Options = {}) {
    this.webview = webview;
    this.options = options;
    this.listenMessage();
  }

  private listenMessage() {
    this.webview.onDidReceiveMessage(async ({ sid, event, data }: Message) => {
      if (!sid) return;

      // request from webview
      if (event) {
        const listener = this.eventListeners[event];
        if (!listener) return;

        const response = await listener(data);
        const responseMessage: ResponseMessage = { sid, data: response };
        this.webview.postMessage(responseMessage);
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

      this.webview.postMessage(message);

      if (this.options.timeout) {
        setTimeout(() => reject("timeout"), this.options.timeout);
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
