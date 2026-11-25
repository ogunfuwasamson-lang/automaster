// heic-convert ships no types: the one call Ivyward makes (lib/file-fit)
declare module "heic-convert" {
  export default function convert(opts: { buffer: Buffer | Uint8Array | ArrayBuffer; format: "JPEG" | "PNG"; quality?: number }): Promise<Uint8Array>;
}
