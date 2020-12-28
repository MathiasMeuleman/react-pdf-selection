import {PDFDocumentProxy} from "pdfjs-dist";
// @ts-ignore-next-line
import {EventBus, PDFLinkService, PDFViewer} from "pdfjs-dist/web/pdf_viewer";
import React, {Component, ReactNode} from "react";
import {getBoundingRect, getClientRects, getPageFromRange, getWindow} from "../utils";
import {BoundingRect, EventBus as EventBusType, LinkService as LinkServiceType, Viewer as ViewerType} from "../types";

import "pdfjs-dist/web/pdf_viewer.css";
import "../style/pdf_viewer.css";

export type Position = {
    boundingRect: BoundingRect,
    rects: Array<BoundingRect>,
    pageNumber: number,
    pageOffset: number
};

export type HighlightTip = {
    position: Position;
    text: string;
};

interface PdfViewerProps {
    pdfDocument: PDFDocumentProxy,
    onTextSelection?: (highlightTip?: HighlightTip) => void;
}

interface PdfViewerState {
    containerNode?: ReactNode;
    viewer?: ViewerType;
    pageHeights: number[];
}

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {

    state: PdfViewerState = {pageHeights: []};
    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({ eventBus: this.eventBus });

    pdfContainerRefCallback = (ref: ReactNode) => {
        if (ref) {
            this.setState({containerNode: ref}, () => this.mountDocument());
        }
    };

    resize = () => {
        if (this.state.viewer) {
            this.state.viewer.currentScaleValue = "page-width";
            const pageHeights = Array.from(this.state.viewer.viewer.childNodes)
                .map((page) => (page as HTMLElement).clientHeight);
            this.setState({ pageHeights });
        }
    };

    onSelectionChange = () => {
        if (!this.state.viewer) return;

        const selection = getWindow(this.state.containerNode).getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
        if (!range) return;

        const page = getPageFromRange(range);
        if (!page) return;

        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;

        const boundingRect = getBoundingRect(rects);
        const pageOffset = this.state.pageHeights.slice(0, page.number - 1).reduce((a, b) => a + b, 0);
        const position: Position = {boundingRect, rects, pageNumber: page.number, pageOffset};
        const text = Array.from(range.cloneContents().childNodes).reduce((a, b) => `${a} ${b.textContent}`, "");

        this.props.onTextSelection?.({position, text});
    };

    onMouseDown = () => {
        this.props.onTextSelection?.();
    };

    onKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Escape")
            this.props.onTextSelection?.();
    };

    addEventListeners = () => {
        this.eventBus.on("pagesinit", this.resize);
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("selectionchange", this.onSelectionChange);
        document.defaultView?.addEventListener("resize", this.resize);
    };

    removeEventListeners = () => {
        this.eventBus.off("pagesinit", this.resize);
        document.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("selectionchange", this.onSelectionChange);
        document.defaultView?.removeEventListener("resize", this.resize);
    };

    componentDidUpdate(prevProps: PdfViewerProps) {
        if (prevProps.pdfDocument !== this.props.pdfDocument) {
            this.mountDocument();
            return;
        }
    }

    mountDocument = () => {
        this.removeEventListeners();
        const viewer = this.state.viewer ||
            new PDFViewer({
                container: this.state.containerNode,
                eventBus: this.eventBus,
                enhanceTextSelection: true,
                removePageBorders: true,
                linkService: this.linkService,
            }) as ViewerType;

        this.linkService.setDocument(this.props.pdfDocument);
        this.linkService.setViewer(viewer);
        viewer.setDocument(this.props.pdfDocument);

        this.setState({viewer});
        this.addEventListeners();
        // debug
        (window as any).PdfViewer = this;
    };

    render = () => {
        return (
            <div
                ref={this.pdfContainerRefCallback}
                className="pdfViewerContainer"
                style={{
                    height: "100%",
                    overflow: "auto",
                    position: "absolute",
                    width: "100%",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <div className="pdfViewer" />
            </div>
        );
    }
}
