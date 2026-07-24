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
  private maskData: ImageData | null = null;
  private seg: ImageSegmenter | null = null;
  private lastTs = 0;
  ready = false;

  async init(): Promise<void> {
    this.seg = await getSegmenter();
    this.ready = true;
  }

  /** Draw the person-only cutout of `cam`, cover-fit into (dx,dy,dw,dh). */
  drawPerson(
    ctx: CanvasRenderingContext2D,
    cam: HTMLVideoElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
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
    ctx.drawImage(this.work, (vw - sw) / 2, (vh - sh) / 2, sw, sh, dx, dy, dw, dh);
  }
}
