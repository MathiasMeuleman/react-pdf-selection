import {PDFDocumentProxy} from "pdfjs-dist";
// @ts-ignore-next-line
import {EventBus, PDFLinkService, PDFViewer} from "pdfjs-dist/web/pdf_viewer";
import React, {Component} from "react";
import {BoundingRect, EventBus as EventBusType, LinkService as LinkServiceType, Viewer as ViewerType} from "../types";
import {getAreaAsPNG, getBoundingRect, getClientRects, getPageFromElement, getPageFromRange, getWindow} from "../utils";
import {AreaSelection} from "./AreaSelection";
import {NewAreaSelection} from "./NewAreaSelection";
import {TextSelection} from "./TextSelection";

import "pdfjs-dist/web/pdf_viewer.css";
import "../style/pdf_viewer.css";

export type Coords = {
    x: number;
    y: number;
}

export type Position = {
    boundingRect: BoundingRect,
    rects: Array<BoundingRect>,
    pageNumber: number,
    pageOffset: number
};

export type TextSelectionType = {
    text: string;
    position: Position;
};

export type AreaSelectionType = {
    image: string;
    position: Position;
}

export type SelectionType = TextSelectionType | AreaSelectionType;

const isAreaSelection = (selection: SelectionType): selection is AreaSelectionType => "image" in selection;

interface PdfViewerProps {
    pdfDocument: PDFDocumentProxy,
    selections?: Array<SelectionType>;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onTextSelection?: (highlightTip?: TextSelectionType) => void;
    onAreaSelection?: (highlightTip?: AreaSelectionType) => void;
}

interface PdfViewerState {
    containerNode?: HTMLDivElement;
    viewer?: ViewerType;
    pageHeights: number[];
    textSelectionEnabled: boolean;
    areaSelection?: {
        originTarget?: HTMLElement;
        start?: Coords;
        end?: Coords;
        position?: Position;
        locked?: boolean;
    };
}

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {

    state: PdfViewerState = {
        pageHeights: [],
        textSelectionEnabled: true,
    };
    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({eventBus: this.eventBus});

    pdfContainerRefCallback = (ref: HTMLDivElement) => {
        if (ref) {
            this.setState({containerNode: ref}, () => this.mountDocument());
        }
    };

    getPageOffset = (pageNumber: number) => {
        return this.state.pageHeights.slice(0, pageNumber - 1).reduce((a, b) => a + b, 0);
    };

    containerCoords = (pageX: number, pageY: number) => {
        if (!this.state.containerNode)
            return;

        const containerBoundingRect = this.state.containerNode.getBoundingClientRect();

        return {
            x: pageX - containerBoundingRect.left + this.state.containerNode.scrollLeft,
            y: pageY - containerBoundingRect.top + this.state.containerNode.scrollTop
        };
    };

    getBoundingRect(start: Coords, end: Coords, pageOffset: number): BoundingRect {
        return {
            left: Math.min(end.x, start.x),
            top: Math.min(end.y - pageOffset, start.y - pageOffset),

            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y)
        };
    }

    resize = () => {
        if (this.state.viewer) {
            this.state.viewer.currentScaleValue = "page-width";
            const pageHeights = Array.from(this.state.viewer.viewer.childNodes)
                .map((page) => (page as HTMLElement).clientHeight);
            this.setState({pageHeights});
        }
    };

    resetSelections = () => {
        this.props.onTextSelection?.();
        this.props.onAreaSelection?.();
        this.setState({areaSelection: undefined, textSelectionEnabled: true});
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
        const pageOffset = this.getPageOffset(page.number);
        const position: Position = {boundingRect, rects, pageNumber: page.number, pageOffset};
        const text = Array.from(range.cloneContents().childNodes).reduce((a, b) => `${a} ${b.textContent}`, "");

        this.props.onTextSelection?.({position, text});
    };

    onAreaSelectStart = (event: React.MouseEvent) => {
        this.setState({textSelectionEnabled: false});
        const start = this.containerCoords(event.pageX, event.pageY);
        if (!start)
            return;

        this.setState({
            areaSelection: {originTarget: event.target as HTMLElement, start, end: undefined, locked: false},
        })
    };

    onAreaSelectChange = (event: MouseEvent) => {
        const {areaSelection} = this.state;
        if (!areaSelection || !areaSelection.originTarget || !areaSelection.start || areaSelection.locked)
            return;
        const end = this.containerCoords(event.pageX, event.pageY);
        if (!end)
            return;
        const page = getPageFromElement(areaSelection.originTarget);
        if (!page)
            return;

        const pageOffset = this.getPageOffset(page.number);
        const boundingRect = this.getBoundingRect(areaSelection.start, end, pageOffset);
        const position: Position = {boundingRect, rects: [boundingRect], pageNumber: page.number, pageOffset};
        this.setState({areaSelection: {...areaSelection, end, position}})
    };

    onAreaSelectEnd = (event: MouseEvent) => {
        if (!this.state.viewer)
            return;
        const {areaSelection} = this.state;
        if (!areaSelection || !areaSelection.originTarget || !areaSelection.start || areaSelection.locked)
            return;
        const end = this.containerCoords(event.pageX, event.pageY);
        if (!end)
            return;
        if (!event.target)
            return;
        const page = getPageFromElement(areaSelection.originTarget);
        if (!page)
            return;

        const pageOffset = this.getPageOffset(page.number);
        const boundingRect = this.getBoundingRect(areaSelection.start, end, pageOffset);
        const position: Position = {boundingRect, rects: [boundingRect], pageNumber: page.number, pageOffset};
        const image = getAreaAsPNG(this.state.viewer.getPageView(page.number - 1).canvas, boundingRect);
        this.props.onAreaSelection?.({position, image});
        this.setState({
            areaSelection: {...areaSelection, end, position, locked: true},
            textSelectionEnabled: true,
        });
    };

    onMouseDown = (event: React.PointerEvent<HTMLDivElement>) => {
        this.resetSelections();
        if (!this.props.enableAreaSelection?.(event))
            return;
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

        this.setState({ viewer });
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
                    ...this.state.textSelectionEnabled ? {} : {
                        userSelect: "none",
                        pointerEvents: "none",
                    },
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <div className="pdfViewer" />
                <div className="pdfViewer__area-selection">
                    {this.state.areaSelection?.position &&
                        <NewAreaSelection position={this.state.areaSelection.position} />}
                </div>
                <div>
                    {this.props.selections?.map((selection, i) => {
                        return isAreaSelection(selection)
                            ? <AreaSelection key={i} areaSelection={selection} />
                            : <TextSelection key={i} textSelection={selection} />
                    })}
                </div>
                {this.props.children}
            </div>
        );
    }
}
