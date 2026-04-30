import fs from "node:fs/promises";
import path from "node:path";

// Railway sets RAILWAY_VOLUME_MOUNT_PATH to e.g. "/app/data" when a volume is attached.
// In dev (no volume), fall back to ./uploads in the project root.
const STORAGE_ROOT =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.PDF_STORAGE_PATH ||
  path.join(process.cwd(), "uploads");

const SOW_DIR = path.join(STORAGE_ROOT, "sows");

async function ensureDir(): Promise<void> {
  await fs.mkdir(SOW_DIR, { recursive: true });
}

export async function savePdf(sowId: string, bytes: Buffer): Promise<string> {
  await ensureDir();
  const filePath = path.join(SOW_DIR, `${sowId}.pdf`);
  await fs.writeFile(filePath, bytes);
  return filePath;
}

export async function readPdf(sowId: string): Promise<Buffer> {
  const filePath = path.join(SOW_DIR, `${sowId}.pdf`);
  return fs.readFile(filePath);
}

export async function deletePdf(sowId: string): Promise<void> {
  const filePath = path.join(SOW_DIR, `${sowId}.pdf`);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
