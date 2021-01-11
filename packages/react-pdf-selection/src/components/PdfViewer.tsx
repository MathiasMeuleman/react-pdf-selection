import React, { Component } from "react";
import {Document, pdfjs} from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "../style/react_pdf_viewer.css";
import {debounce} from "../../dist/utils/debounce";
import {
    BoundingRect,
    NormalizedPosition,
    Position,
    Viewer as ViewerType,
} from "../types";
import {
    Dimensions,
    getAreaAsPNG,
    getBoundingRect,
    getClientRects,
    getPageFromElement,
    getPageFromRange,
    getWindow,
} from "../utils";
import { normalizePosition } from "../utils/coordinates";
import {PdfPage} from "./PdfPage";

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

export const isAreaSelection = (selection: SelectionType): selection is AreaSelectionType => "image" in selection;

interface PdfViewerProps {
    url: string;
    selections?: Array<SelectionType>;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onTextSelection?: (highlightTip?: NormalizedTextSelection) => void;
    onAreaSelection?: (highlightTip?: NormalizedAreaSelection) => void;
}

interface PdfViewerState {
    containerWidth?: number;
    pageDimensions: { [key: number]: Dimensions };
    containerNode?: HTMLDivElement;
    viewer?: ViewerType;
    textSelectionEnabled: boolean;
    areaSelection?: {
        originTarget?: HTMLElement;
        start?: Coords;
        position?: NormalizedPosition;
        locked?: boolean;
    };
    numPages: number;
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {
    state: PdfViewerState = {
        pageDimensions: {},
        textSelectionEnabled: true,
        numPages: 0,
    };

    containerCoords = (pageX: number, pageY: number) => {
        if (!this.state.containerNode) return;

        return {
            x: pageX - this.state.containerNode.offsetLeft,
            y: pageY - this.state.containerNode.offsetTop,
        };
    };

    getBoundingRect(start: Coords, end: Coords): BoundingRect {
        return {
            left: Math.min(end.x, start.x),
            top: Math.min(end.y, start.y),
            right: Math.max(end.x, start.x),
            bottom: Math.max(end.y, start.y),
        };
    }

    resetSelections = () => {
        this.props.onTextSelection?.();
        this.props.onAreaSelection?.();
        this.setState({ areaSelection: undefined, textSelectionEnabled: true });
    };

    onSelectionChange = () => {
        const selection = getWindow(this.state.containerNode).getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
        if (!range) return;

        const page = getPageFromRange(range);
        if (!page) return;
        const pageDimension = this.state.pageDimensions[page.number];
        if (!pageDimension) return;

        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;

        const boundingRect = getBoundingRect(rects);
        const position = normalizePosition({ boundingRect, rects, pageNumber: page.number }, pageDimension);
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

        const viewport = { width: page.node.clientWidth, height: page.node.clientHeight };
        const boundingRect = this.getBoundingRect(areaSelection.start, end);
        return normalizePosition(
            { boundingRect, rects: [boundingRect], pageNumber: page.number },
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

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 0;

    containerDiv: HTMLElement | null = null;

    selectionMap: { [key: number]: SelectionType[] } | undefined;

    componentDidMount = () => {
        this.computeSelectionMap();
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("selectionchange", this.onSelectionChange);
        document.defaultView?.addEventListener("resize", this.debouncedSetContainerWidth);

        // debug
        (window as any).PdfViewer = this;
    };

    componentDidUpdate = (nextProps: PdfViewerProps) => {
        if (this.props.selections !== nextProps.selections)
            this.computeSelectionMap();
    };

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("selectionchange", this.onSelectionChange);
        document.defaultView?.removeEventListener("resize", this.debouncedSetContainerWidth);
    };

    computeSelectionMap = () => {
        if (!this.props.selections) {
            this.selectionMap = undefined;
            return;
        }
        const selectionMap: { [key: number]: SelectionType[] } = {};
        this.props.selections.forEach((selection) => {
            selectionMap[selection.position.pageNumber] = [
                ...selectionMap[selection.position.pageNumber] ?? [],
                selection,
            ];
        });
        this.selectionMap = selectionMap;
    };

    setContainerWidth = () => {
        if (!this.containerDiv) return;
        const pageDimensions: { [key: number]: Dimensions } = {};
        this.containerDiv.childNodes[0]?.childNodes.forEach((page, i) => {
            pageDimensions[i + 1] = {
                width: (page.childNodes[0] as HTMLCanvasElement).width,
                height: (page.childNodes[0] as HTMLCanvasElement).height,
            };
        });
        this.setState({
            pageDimensions,
            containerWidth: this.containerDiv.getBoundingClientRect().width - this.BORDER_WIDTH_OFFSET,
        });
    };

    debouncedSetContainerWidth = debounce(this.setContainerWidth, 500);

    onDocumentLoad = ({ numPages }: pdfjs.PDFDocumentProxy) => {
        this.setContainerWidth();
        this.setState({numPages});
    };

    render = () => {
        return (
            <div
                ref={(ref) => this.containerDiv = ref}
                style={{
                    position: "relative",
                    width: "100%",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <Document
                    file={this.props.url}
                    onLoadSuccess={this.onDocumentLoad}
                    options={{removePageBorders: false}}
                >
                    {
                        Array.from(
                            new Array(this.state.numPages),
                        (el, index) => (
                                <PdfPage
                                    key={index}
                                    pageNumber={index + 1}
                                    width={this.state.containerWidth}
                                    selections={this.selectionMap?.[index + 1]}
                                />
                            ),
                        )
                    }
                </Document>
            </div>
        );
    };
}
