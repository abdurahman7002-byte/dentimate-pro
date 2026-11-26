export function getAttributeSync(file: string, attr: string): Buffer;
export function setAttributeSync(file: string, attr: string, value: string | Buffer): void;
export function removeAttributeSync(file: string, attr: string): void;
export function getAttribute(file: string, attr: string): Promise<Buffer>;
export function setAttribute(file: string, attr: string, value: string | Buffer): Promise<void>;
export function removeAttribute(file: string, attr: string): Promise<void>;
export function listAttributes(file: string): Promise<string[]>;
