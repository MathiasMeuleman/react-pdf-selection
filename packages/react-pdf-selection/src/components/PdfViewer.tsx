import React, {Component} from "react";
import {Document, pdfjs} from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import {debounce} from "../../dist/utils/debounce";
import "../style/react_pdf_viewer.css";
import {NormalizedPosition, Position} from "../types";
import {getBoundingRect, getClientRects, getPageFromRange, getWindow} from "../utils";
import {normalizePosition} from "../utils/coordinates";
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
    textSelectionEnabled: boolean;
    areaSelectionActivePage?: number;
    numPages: number;
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {
    state: PdfViewerState = {
        textSelectionEnabled: true,
        numPages: 0,
    };

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 18;

    containerDiv: HTMLElement | null = null;

    selectionMap: { [key: number]: SelectionType[] } | undefined;

    /**
     * Lifecycle function
     */

    componentDidMount = () => {
        this.computeSelectionMap();
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("selectstart", this.onTextSelectionStart);
        document.addEventListener("selectionchange", this.onTextSelectionChange);
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
        document.removeEventListener("selectstart", this.onTextSelectionStart);
        document.removeEventListener("selectionchange", this.onTextSelectionChange);
        document.defaultView?.removeEventListener("resize", this.debouncedSetContainerWidth);
    };

    /**
     * Helpers
     */

    resetSelections = () => {
        this.clearTextSelection();
        this.clearAreaSelection();
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
        this.setState({
            containerWidth: this.containerDiv.getBoundingClientRect().width - this.BORDER_WIDTH_OFFSET,
        });
    };

    debouncedSetContainerWidth = debounce(this.setContainerWidth, 500);

    /**
     * Text selection handlers
     */

    clearTextSelection = () => {
        getWindow(this.containerDiv).getSelection()?.removeAllRanges();
        this.props.onTextSelection?.();
    };

    onTextSelectionStart = () => {
        this.clearAreaSelection();
    };

    onTextSelectionChange = () => {
        const selection = getWindow(this.containerDiv).getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
        if (!range) return;

        const page = getPageFromRange(range);
        if (!page) return;
        const pageDimension = {width: page.node.clientWidth, height: page.node.clientHeight};

        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;

        const boundingRect = getBoundingRect(rects);
        const position = normalizePosition({ boundingRect, rects, pageNumber: page.number }, pageDimension);
        const text = Array.from(range.cloneContents().childNodes).reduce((a, b) => `${a} ${b.textContent}`, "");

        this.props.onTextSelection?.({ position, text });
    };

    /**
     * Area selection handlers
     */

    clearAreaSelection = () => {
        this.setState({ areaSelectionActivePage: undefined, textSelectionEnabled: true });
        this.props.onAreaSelection?.();
    };

    onAreaSelectionStart = (pageNumber: number) => {
        this.clearTextSelection();
        this.setState({ textSelectionEnabled: false, areaSelectionActivePage: pageNumber });
    };

    onAreaSelectionEnd = (selection: NormalizedAreaSelection) => {
        this.setState({ textSelectionEnabled: true });
        this.props.onAreaSelection?.(selection);
    };

    /**
     * Event handlers
     */

    onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape")
            this.resetSelections();
    };

    onMouseDown = () => {
        this.resetSelections();
    };

    onDocumentLoad = ({ numPages }: pdfjs.PDFDocumentProxy) => {
        this.setContainerWidth();
        this.setState({numPages});
    };

    render = () => {
        const { areaSelectionActivePage, containerWidth, numPages } = this.state;
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
                            new Array(5),
                            (el, index) => (
                                <PdfPage
                                    key={index}
                                    pageNumber={index + 1}
                                    width={containerWidth}
                                    selections={this.selectionMap?.[index + 1]}
                                    areaSelectionActive={areaSelectionActivePage ? areaSelectionActivePage === index + 1 : false}
                                    enableAreaSelection={this.props.enableAreaSelection}
                                    onAreaSelectionStart={this.onAreaSelectionStart}
                                    onAreaSelectionEnd={this.onAreaSelectionEnd}
                                />
                            ),
                        )
                    }
                </Document>
            </div>
        );
    };
}
