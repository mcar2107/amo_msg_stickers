/**
 * Подменяет `DecompressionStream` обёрткой, которая считает распакованные байты: тест zip-бомбы
 * проверяет, что распаковка оборвана рано, а не только что она закончилась ошибкой.
 *
 * @returns счётчик распакованных байтов и подмена для `vi.stubGlobal`
 */
export const countingDecompression = () => {
  const Native = globalThis.DecompressionStream;
  const counter = { bytes: 0 };

  /**
   * Распаковщик с подсчётом выхода.
   */
  class CountingDecompressionStream {
    readonly readable: ReadableStream<Uint8Array<ArrayBuffer>>;
    readonly writable: WritableStream<BufferSource>;

    /**
     * @param format — формат сжатия
     */
    constructor(format: CompressionFormat) {
      const native = new Native(format);

      this.writable = native.writable;
      this.readable = native.readable.pipeThrough(
        new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
          transform: (chunk, controller) => {
            counter.bytes += chunk.byteLength;
            controller.enqueue(chunk);
          },
        })
      );
    }
  }

  return { counter, CountingDecompressionStream };
};
