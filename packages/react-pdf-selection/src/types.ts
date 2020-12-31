import { PDFDocumentProxy, PDFPageViewport } from "pdfjs-dist";

export type BoundingRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type Scaled = {
    x1: number;
    y1: number;

    x2: number;
    y2: number;

    width: number;
    height: number;
};

export type Position = {
    boundingRect: BoundingRect;
    rects: Array<BoundingRect>;
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
    ) => {
        textLayer: { textLayerDiv: HTMLDivElement };
        viewport: PDFPageViewport;
        div: HTMLDivElement;
        canvas: HTMLCanvasElement;
    };
    setDocument: (document: PDFDocumentProxy) => Promise<void>;
    scrollPageIntoView: (options: { pageNumber: number; destArray: Array<any> }) => void;
    currentScaleValue: string;
};

export type LinkService = {
    setDocument: (document: Object) => void;
    setViewer: (viewer: Viewer) => void;
};
