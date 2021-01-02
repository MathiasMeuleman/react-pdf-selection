import { PDFDocumentProxy } from "pdfjs-dist";
// @ts-ignore-next-line
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer";

import "pdfjs-dist/web/pdf_viewer.css";
import React, { Component } from "react";
import "../style/pdf_viewer.css";
import {
    BoundingRect,
    EventBus as EventBusType,
    LinkService as LinkServiceType,
    NormalizedPosition,
    Position,
    Viewer as ViewerType,
} from "../types";
import {
    getAreaAsPNG,
    getBoundingRect,
    getClientRects,
    getPageFromElement,
    getPageFromRange,
    getWindow,
    positionToViewport,
    viewportPosition,
} from "../utils";
import { normalizePosition } from "../utils/coordinates";
import { AreaSelection } from "./AreaSelection";
import { NewAreaSelection } from "./NewAreaSelection";
import { TextSelection } from "./TextSelection";

export type Coords = {
    x: number;
    y: number;
};

export type TextSelectionType = {
    text: string;
    position: Position;
};

export type AreaSelectionType = {
    image: string;
    position: Position;
};

export type SelectionType = TextSelectionType | AreaSelectionType;

export type NormalizedTextSelection = {
    text: string;
    position: NormalizedPosition;
};

export type NormalizedAreaSelection = {
    image: string;
    position: NormalizedPosition;
};

export type NormalizedSelection = NormalizedTextSelection | NormalizedAreaSelection;

const isAreaSelection = (selection: SelectionType): selection is AreaSelectionType => "image" in selection;

interface PdfViewerProps {
    pdfDocument: PDFDocumentProxy;
    selections?: Array<SelectionType>;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onTextSelection?: (highlightTip?: NormalizedTextSelection) => void;
    onAreaSelection?: (highlightTip?: NormalizedAreaSelection) => void;
}

interface PdfViewerState {
    containerNode?: HTMLDivElement;
    viewer?: ViewerType;
    pageHeights: number[];
    textSelectionEnabled: boolean;
    areaSelection?: {
        originTarget?: HTMLElement;
        start?: Coords;
        position?: NormalizedPosition;
        locked?: boolean;
    };
}

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {
    state: PdfViewerState = {
        pageHeights: [],
        textSelectionEnabled: true,
    };
    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({ eventBus: this.eventBus });

    pdfContainerRefCallback = (ref: HTMLDivElement) => {
        if (ref) {
            this.setState({ containerNode: ref }, () => this.mountDocument());
        }
    };

    getPageOffset = (pageNumber: number) => {
        return this.state.pageHeights.slice(0, pageNumber - 1).reduce((a, b) => a + b, 0);
    };

    containerCoords = (pageX: number, pageY: number) => {
        if (!this.state.containerNode) return;

        const containerBoundingRect = this.state.containerNode.getBoundingClientRect();

        return {
            x: pageX - containerBoundingRect.left + this.state.containerNode.scrollLeft,
            y: pageY - containerBoundingRect.top + this.state.containerNode.scrollTop,
        };
    };

    getBoundingRect(start: Coords, end: Coords, pageOffset: number): BoundingRect {
        return {
            left: Math.min(end.x, start.x),
            top: Math.min(end.y - pageOffset, start.y - pageOffset),

            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
        };
    }

    resize = () => {
        if (this.state.viewer) {
            this.state.viewer.currentScaleValue = "page-width";
            const pageHeights = Array.from(this.state.viewer.viewer.childNodes).map(
                (page) => (page as HTMLElement).clientHeight,
            );
            this.setState({ pageHeights });
        }
    };

    resetSelections = () => {
        this.props.onTextSelection?.();
        this.props.onAreaSelection?.();
        this.setState({ areaSelection: undefined, textSelectionEnabled: true });
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

        const viewport = { width: page.node.clientWidth, height: page.node.clientHeight };
        const boundingRect = getBoundingRect(rects);
        const pageOffset = this.getPageOffset(page.number);
        const position = normalizePosition({ boundingRect, rects, pageNumber: page.number, pageOffset }, viewport);
        const text = Array.from(range.cloneContents().childNodes).reduce((a, b) => `${a} ${b.textContent}`, "");

        this.props.onTextSelection?.({ position, text });
    };

    onAreaSelectStart = (event: React.MouseEvent) => {
        this.setState({ textSelectionEnabled: false });
        const start = this.containerCoords(event.pageX, event.pageY);
        if (!start) return;

        this.setState({
            areaSelection: { originTarget: event.target as HTMLElement, start, locked: false },
        });
    };

    getAreaSelectionPosition = (event: MouseEvent) => {
        const { areaSelection } = this.state;
        if (!areaSelection || !areaSelection.originTarget || !areaSelection.start || areaSelection.locked) return;
        const end = this.containerCoords(event.pageX, event.pageY);
        if (!end) return;
        const page = getPageFromElement(areaSelection.originTarget);
        if (!page) return;

        const pageOffset = this.getPageOffset(page.number);
        const viewport = { width: page.node.clientWidth, height: page.node.clientHeight };
        const boundingRect = this.getBoundingRect(areaSelection.start, end, pageOffset);
        return normalizePosition(
            { boundingRect, rects: [boundingRect], pageNumber: page.number, pageOffset },
            viewport,
        );
    };

    onAreaSelectChange = (event: MouseEvent) => {
        const { areaSelection } = this.state;
        const position = this.getAreaSelectionPosition(event);
        if (!position) return;
        this.setState({ areaSelection: { ...areaSelection, position } });
    };

    onAreaSelectEnd = (event: MouseEvent) => {
        const { areaSelection } = this.state;
        if (!this.state.viewer) return;
        const position = this.getAreaSelectionPosition(event);
        if (!position) return;
        const pageView = this.state.viewer.getPageView(position.pageNumber - 1);
        if (!pageView) return;
        const image = getAreaAsPNG(pageView.canvas, position.absolute.boundingRect);
        this.props.onAreaSelection?.({ position, image });
        this.setState({
            areaSelection: { ...areaSelection, position, locked: true },
            textSelectionEnabled: true,
        });
    };

    onMouseDown = (event: React.PointerEvent<HTMLDivElement>) => {
        this.resetSelections();
        if (!this.props.enableAreaSelection?.(event)) return;
        document.addEventListener("pointermove", this.onMouseMove);
        document.addEventListener("pointerup", this.onMouseUp);
        event.preventDefault();
        event.stopPropagation();
        this.onAreaSelectStart(event);
    };

    onMouseMove = (event: MouseEvent) => {
        event.stopPropagation();
        this.onAreaSelectChange(event);
    };

    onMouseUp = (event: MouseEvent) => {
        document.removeEventListener("pointermove", this.onMouseMove);
        document.removeEventListener("pointerup", this.onMouseUp);
        event.stopPropagation();
        this.onAreaSelectEnd(event);
    };

    onKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Escape") this.props.onTextSelection?.();
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
        const viewer =
            this.state.viewer ||
            (new PDFViewer({
                container: this.state.containerNode,
                eventBus: this.eventBus,
                enhanceTextSelection: true,
                removePageBorders: true,
                linkService: this.linkService,
            }) as ViewerType);

        this.linkService.setDocument(this.props.pdfDocument);
        this.linkService.setViewer(viewer);
        viewer.setDocument(this.props.pdfDocument);

        this.setState({ viewer });
        this.addEventListeners();
        // debug
        (window as any).PdfViewer = this;
    };

    getPageViewport = (pageNumber: number) => {
        if (!this.state.viewer) return;
        const pageView = this.state.viewer.getPageView(pageNumber);
        return pageView?.viewport;
    };

    renderSelection = (selection: SelectionType, i: number) => {
        const pageViewport = this.getPageViewport(selection.position.pageNumber);
        if (!pageViewport) return null;
        const normalizedSelection = { ...selection, position: positionToViewport(selection.position, pageViewport) };
        return isAreaSelection(normalizedSelection) ? (
            <AreaSelection key={i} areaSelection={normalizedSelection} />
        ) : (
            <TextSelection key={i} textSelection={normalizedSelection} />
        );
    };

    render = () => {
        const newAreaViewport = this.state.areaSelection?.position
            ? this.getPageViewport(this.state.areaSelection.position.pageNumber)
            : undefined;
        return (
            <div
                ref={this.pdfContainerRefCallback}
                className="pdfViewerContainer"
                style={{
                    height: "100%",
                    overflow: "auto",
                    position: "absolute",
                    width: "100%",
                    ...(this.state.textSelectionEnabled
                        ? {}
                        : {
                              userSelect: "none",
                              pointerEvents: "none",
                          }),
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <div className="pdfViewer" />
                <div className="pdfViewer__area-selection">
                    {this.state.areaSelection?.position && newAreaViewport && (
                        <NewAreaSelection
                            position={viewportPosition(this.state.areaSelection.position, newAreaViewport)}
                        />
                    )}
                </div>
                <div>
                    {this.props.selections?.map((selection, i) => {
                        return this.renderSelection(selection, i);
                    })}
                </div>
                {this.props.children}
            </div>
        );
    };
}
