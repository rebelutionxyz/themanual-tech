import type { ImageSegmenter } from '@mediapipe/tasks-vision';

// ═════════════════════════════════════════════════════════════════════
// HOLO — in-browser person cutout (no green screen). Creator Studio.
// MediaPipe selfie segmentation (GPU delegate, VIDEO mode); model + wasm
// load lazily from CDNs only when a Bee first picks the Holo layout, so
// the main bundle carries none of it. 2026-07-24.
// ═════════════════════════════════════════════════════════════════════

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

let segmenter: ImageSegmenter | null = null;
let loading: Promise<ImageSegmenter> | null = null;

async function getSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return segmenter;
  if (!loading) {
    loading = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      segmenter = await vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      return segmenter;
    })().catch((e) => {
      loading = null; // allow retry
      throw e;
    });
  }
  return loading;
}

/**
 * Per-page compositor with reusable offscreen canvases. Call init() once
 * (async model load), then drawPerson() each frame inside the rAF loop.
 */
export class HoloCompositor {
  private work = document.createElement('canvas');
  private mask = document.createElement('canvas');
  private pixel: HTMLCanvasElement | null = null;
  private maskData: ImageData | null = null;
  private seg: ImageSegmenter | null = null;
  private lastTs = 0;
  ready = false;

  async init(): Promise<void> {
    this.seg = await getSegmenter();
    this.ready = true;
  }

  /**
   * Draw the person-only cutout of `cam`, cover-fit into (dx,dy,dw,dh).
   * opts (Block 19): privacy filters compose with the cutout — `filter` is a
   * canvas filter string (blur/noir), `pixelCells` mosaics the cutout while
   * keeping its alpha, so you can be a chunky ghost on a brand backdrop.
   */
  drawPerson(
    ctx: CanvasRenderingContext2D,
    cam: HTMLVideoElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    opts?: { filter?: string; pixelCells?: number },
  ): void {
    const seg = this.seg;
    if (!seg || cam.readyState < 2) return;
    const vw = cam.videoWidth;
    const vh = cam.videoHeight;
    if (!vw || !vh) return;
    if (this.work.width !== vw || this.work.height !== vh) {
      this.work.width = vw;
      this.work.height = vh;
      this.mask.width = vw;
      this.mask.height = vh;
      this.maskData = null;
    }
    // segmentForVideo requires a strictly increasing timestamp.
    const ts = Math.max(performance.now(), this.lastTs + 1);
    this.lastTs = ts;
    const res = seg.segmentForVideo(cam, ts);
    const cm = res.confidenceMasks?.[0];
    if (!cm) {
      res.close();
      return;
    }
    const arr = cm.getAsFloat32Array();
    const mctx = this.mask.getContext('2d');
    const wctx = this.work.getContext('2d');
    if (!mctx || !wctx) {
      res.close();
      return;
    }
    if (!this.maskData) this.maskData = mctx.createImageData(vw, vh);
    const px = this.maskData.data;
    // Soft-edge alpha ramp around the confidence threshold — cleaner hair/
    // shoulder edges than a hard 0.5 cut.
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      px[i * 4 + 3] = c <= 0.35 ? 0 : c >= 0.65 ? 255 : (((c - 0.35) / 0.3) * 255) | 0;
    }
    mctx.putImageData(this.maskData, 0, 0);
    wctx.clearRect(0, 0, vw, vh);
    wctx.drawImage(cam, 0, 0);
    wctx.globalCompositeOperation = 'destination-in';
    wctx.drawImage(this.mask, 0, 0);
    wctx.globalCompositeOperation = 'source-over';
    res.close();
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    if (opts?.pixelCells) {
      // Mosaic the cutout: downscale (alpha rides along) → upscale, smoothing
      // off. Transparent background stays transparent — chunky person only.
      if (!this.pixel) this.pixel = document.createElement('canvas');
      const pc = this.pixel;
      pc.width = opts.pixelCells;
      pc.height = Math.max(2, Math.round((opts.pixelCells * dh) / dw));
      const pctx = pc.getContext('2d');
      if (!pctx) return;
      pctx.clearRect(0, 0, pc.width, pc.height);
      pctx.drawImage(this.work, sx, sy, sw, sh, 0, 0, pc.width, pc.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pc, dx, dy, dw, dh);
      ctx.imageSmoothingEnabled = true;
      return;
    }
    if (opts?.filter) ctx.filter = opts.filter;
    ctx.drawImage(this.work, sx, sy, sw, sh, dx, dy, dw, dh);
    if (opts?.filter) ctx.filter = 'none';
  }
}

let imageSegmenter: ImageSegmenter | null = null;
let imageLoading: Promise<ImageSegmenter> | null = null;

async function getImageSegmenter(): Promise<ImageSegmenter> {
  if (imageSegmenter) return imageSegmenter;
  if (!imageLoading) {
    imageLoading = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      imageSegmenter = await vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      return imageSegmenter;
    })().catch((e) => {
      imageLoading = null;
      throw e;
    });
  }
  return imageLoading;
}

/** Person-cutout of a still image → new canvas with transparent background. */
export async function cutoutImage(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const seg = await getImageSegmenter();
  const res = seg.segment(source);
  const cm = res.confidenceMasks?.[0];
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const octx = out.getContext('2d');
  if (!octx) {
    res.close();
    return source;
  }
  octx.drawImage(source, 0, 0);
  if (cm) {
    const arr = cm.getAsFloat32Array();
    const mask = document.createElement('canvas');
    mask.width = source.width;
    mask.height = source.height;
    const mctx = mask.getContext('2d');
    if (mctx) {
      const md = mctx.createImageData(mask.width, mask.height);
      const px = md.data;
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        px[i * 4 + 3] = c <= 0.35 ? 0 : c >= 0.65 ? 255 : (((c - 0.35) / 0.3) * 255) | 0;
      }
      mctx.putImageData(md, 0, 0);
      octx.globalCompositeOperation = 'destination-in';
      octx.drawImage(mask, 0, 0);
      octx.globalCompositeOperation = 'source-over';
    }
  }
  res.close();
  return out;
}
