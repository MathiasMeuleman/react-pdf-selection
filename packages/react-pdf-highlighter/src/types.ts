import {PDFDocumentProxy, PDFPageViewport} from "pdfjs-dist";

export type BoundingRect = {
    left: number,
    top: number,
    width: number,
    height: number
};

export type Scaled = {
    x1: number,
    y1: number,

    x2: number,
    y2: number,

    width: number,
    height: number
};

export type Position = {
    boundingRect: BoundingRect,
    rects: Array<BoundingRect>,
    pageNumber: number
};

export type ScaledPosition = {
    boundingRect: Scaled,
    rects: Array<Scaled>,
    pageNumber: number,
    usePdfCoordinates?: boolean
};

export type Content = {
    text?: string,
    image?: string
};

export type HighlightContent = {
    content: Content
};

export type Comment = {
    text: string,
    emoji: string
};
export type HighlightComment = {
    comment: Comment
};

export type NewHighlight = {
    position: ScaledPosition
} & HighlightContent &
    HighlightComment;

export type Highlight = {id: string} & NewHighlight;

export type ViewportHighlight = {
    position: Position
} & HighlightContent &
    HighlightComment;

export type EventBus = {
    on: (eventName: string, callback: () => void) => void,
    off: (eventName: string, callback: () => void) => void
};

export type Viewer = {
    container: HTMLDivElement,
    viewer: HTMLDivElement,
    getPageView: (
        page: number
    ) => {
        textLayer: { textLayerDiv: HTMLDivElement },
        viewport: PDFPageViewport,
        div: HTMLDivElement,
        canvas: HTMLCanvasElement
    },
    setDocument: (document: PDFDocumentProxy) => Promise<void>,
    scrollPageIntoView: (options: {
        pageNumber: number,
        destArray: Array<any>
    }) => void,
    currentScaleValue: string
};

export type LinkService = {
    setDocument: (document: Object) => void,
    setViewer: (viewer: Viewer) => void
};
