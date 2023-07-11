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

interface Vscode {
  postMessage: (msg: unknown) => void;
}

export class Messenger {
  private vscode: Vscode;
  private options: Options;
  private eventListeners: Record<string, (data: any) => Promise<any> | any> =
    {};
  private pendingRequests: Record<string, (data: any) => any> = {};
  private sid: number = 0;

  constructor(vscode: Vscode, options: Options = {}) {
    this.vscode = vscode;
    this.options = options;
    this.listenMessage();
  }

  private listenMessage() {
    window.addEventListener("message", async (e) => {
      const { sid, event, data }: Message = e.data;
      if (!sid) return;

      // request from extension
      if (event) {
        const listener = this.eventListeners[event];
        if (!listener) return;

        const response = await listener(data);
        const responseMessage: ResponseMessage = { sid, data: response };
        this.vscode.postMessage(responseMessage);
        return;
      }

      // response from extension
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

      this.vscode.postMessage(message);

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
