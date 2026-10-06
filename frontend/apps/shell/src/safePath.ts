/**
 * True only for same-origin app paths. Rejects protocol-relative ("//x", "/\x") and
 * control characters, which URL parsing strips ("/\t/x" becomes "//x").
 */
export const isSafeInternalPath = (path: string): boolean =>
  /^\/(?![/\\])/.test(path) && !/[\u0000-\u001f\u007f]/.test(path)
