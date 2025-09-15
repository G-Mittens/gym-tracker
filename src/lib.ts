// src/lib.ts
export const rid = () => Math.random().toString(36).slice(2, 9);

export async function readFilesAsDataUrls(files: FileList | File[], max = 3): Promise<string[]> {
  const arr = Array.from(files as any).slice(0, max);
  return Promise.all(
    arr.map(
      (f: File) =>
        new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result ?? ""));
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(f);
        })
    )
  );
}

export function mmssToSeconds(mm: string, ss: string) {
  const m = Math.max(0, parseInt(mm || "0", 10) || 0);
  const s = Math.max(0, parseInt(ss || "0", 10) || 0);
  return m * 60 + s;
}

export function secondsToMMSS(total: number) {
  const t = Math.max(0, Math.floor(total || 0));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
