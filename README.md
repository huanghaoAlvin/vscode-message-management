# What is VSCode Message Management?

VSCode Message Management is a library that has ability to gain response of a request between extension and webview.

```ts
// types.d.ts
interface RequestFromWebview {
  left: number;
  right: number;
}
interface ResponseFromExtension {
  result: number;
}
interface RequestFromExtension {
  msg: string;
}
interface ResponseFromWebview {
  ok: boolean;
}
```

## Extension

```ts
import * as vscode from "vscode";
import { extensionMessenger } from "vscode-message-management";

const webviewPanel = vscode.window.createWebviewPanel(
  "myWebview",
  "myWebview",
  vscode.ViewColumn.Active,
  {
    enableScripts: true,
  }
)

const messenger = new extensionMessenger.Messenger(webviewPanel)

messenger.request<RequestFromExtension, ResponseFromWebview>(
  "helloWorld",
  {msg: "success"}
).then(console.log) // { ok: true }

// recept a request from webview and send a response
messenger.bind<RequestFromWebview, ResponseFromExtension>(
  "addition", // each event id can be only bound once
  (data) => {
    console.log(data) // { left: 1, right: 2 }
    return { result: data.left + data.right }
  }
)



```

## Webview

```ts
import { webviewMessenger } from "vscode-message-management";

const vscode = acquireVsCodeApi()
const messenger = new webviewMessenger.Messenger(vscode)

// recept a request from extension and send a response
messenger.bind<RequestFromExtension, ResponseFromWebview>(
  "helloWorld", // each event id can be only bound once
  (data) => {
    console.log(data.msg) // success
    return { ok: true }
  }
)

// send a request to extension and gain a response
messenger.request<RequestFromWebview, ResponseFromExtension>(
  "addition",
  { left: 1, right: 2 }
).then(console.log) // { result: 3 }

```