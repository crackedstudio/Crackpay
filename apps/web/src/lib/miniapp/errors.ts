/** JSON-RPC error returned to a Mini App. Codes follow EIP-1193 and EIP-1474. */
export class RpcError extends Error {
  override name = "RpcError";
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export const userRejected = () => new RpcError(4001, "The user rejected the request");
export const unauthorized = (message: string) => new RpcError(4100, message);
export const unsupported = (method: string) => new RpcError(4200, `${method} is not supported`);
export const invalidParams = (message: string) => new RpcError(-32602, message);
