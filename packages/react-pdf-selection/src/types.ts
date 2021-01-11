import { PDFDocumentProxy, PDFPageViewport } from "pdfjs-dist";

export type BoundingRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export type SelectionRects = {
    boundingRect: BoundingRect;
    rects: Array<BoundingRect>;
};

export type Position = {
    pageNumber: number;
} & SelectionRects;

export type NormalizedPosition = {
    absolute: SelectionRects;
    normalized: SelectionRects;
    pageNumber: number;
};

export type EventBus = {
    on: (eventName: string, callback: () => void) => void;
    off: (eventName: string, callback: () => void) => void;
};

export type Viewer = {
    container: HTMLDivElement;
    viewer: HTMLDivElement;
    getPageView: (
        page: number,
    ) =>
        | {
              textLayer: { textLayerDiv: HTMLDivElement };
              viewport: PDFPageViewport;
              div: HTMLDivElement;
              canvas: HTMLCanvasElement;
          }
        | undefined;
    setDocument: (document: PDFDocumentProxy) => Promise<void>;
    scrollPageIntoView: (options: { pageNumber: number; destArray: Array<any> }) => void;
    currentScaleValue: string;
};

export type LinkService = {
    setDocument: (document: Object) => void;
    setViewer: (viewer: Viewer) => void;
};
