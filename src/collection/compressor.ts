export async function compressCollection<T>(data: T) {
  const json = JSON.stringify(data);

  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));

  const compressed = await new Response(stream).arrayBuffer();

  const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));

  return base64;
}

export async function decompressCollection<T>(base64: string): Promise<T> {
  let binaryData: Uint8Array;

  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(base64, "base64");
    binaryData = Uint8Array.from(buffer);
  } else if (typeof atob !== "undefined") {
    binaryData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } else {
    throw new TypeError("No base64 decoding method available");
  }

  const binary = atob(base64);

  const compressed = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  const json = await new Response(stream).text();

  const data = JSON.parse(json);

  return data as T;
}
