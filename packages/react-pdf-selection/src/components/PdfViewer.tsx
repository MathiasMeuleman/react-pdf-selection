import React, {Component} from "react";
import {Document, pdfjs} from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import {ListOnItemsRenderedProps, VariableSizeList} from "react-window";
import {debounce} from "../../dist/utils/debounce";
import "../style/react_pdf_viewer.css";
import {NormalizedPosition, Position} from "../types";
import {getBoundingRect, getClientRects, getPageFromRange, getWindow} from "../utils";
import {normalizePosition} from "../utils/coordinates";
import {PdfPage, PdfPageData} from "./PdfPage";

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
    containerHeight: number;
    textSelectionEnabled: boolean;
    areaSelectionActivePage?: number;
    currentPage: number;
    numPages: number;
    pageDimensions?: Map<number, {width: number, height: number}>;
    responsiveScale: number;
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {

    state: PdfViewerState = {
        containerHeight: 0,
        textSelectionEnabled: true,
        currentPage: 1,
        numPages: 0,
        responsiveScale: 1,
    };

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 18;

    /** Scale value for PDF size */
    scale = 1.2;

    containerDiv: HTMLElement | null = null;
    listDiv: VariableSizeList | null = null;
    pageRefs: Map<number, HTMLDivElement | null> = new Map();

    selectionMap: Map<number, SelectionType[]> | undefined;

    _mounted: boolean = false;

    /**
     * Lifecycle function
     */

    componentDidMount = () => {
        this._mounted = true;
        this.computeSelectionMap();
        this.handleResize();
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("selectstart", this.onTextSelectionStart);
        document.addEventListener("selectionchange", this.onTextSelectionChange);
        document.defaultView?.addEventListener("resize", this.debouncedHandleResize);

        // debug
        (window as any).PdfViewer = this;
    };

    componentDidUpdate = (prevProps: PdfViewerProps) => {
        if (this.props.selections !== prevProps.selections)
            this.computeSelectionMap();
    };

    componentWillUnmount = () => {
        this._mounted = false;
        document.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("selectstart", this.onTextSelectionStart);
        document.removeEventListener("selectionchange", this.onTextSelectionChange);
        document.defaultView?.removeEventListener("resize", this.debouncedHandleResize);
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
        const selectionMap: Map<number, SelectionType[]> = new Map();
        this.props.selections.forEach((selection) => {
            selectionMap.set(selection.position.pageNumber, [
                ...selectionMap.get(selection.position.pageNumber) ?? [],
                selection,
            ]);
        });
        this.selectionMap = selectionMap;
    };

    computePageDimensions = (pdf: pdfjs.PDFDocumentProxy) => {
        const promises = Array.from({ length: pdf.numPages }).map((x, i) => i + 1).map((pageNumber) => {
            return new Promise<pdfjs.PDFPageProxy>((resolve, reject) => {
                pdf.getPage(pageNumber).then(resolve, reject);
            });
        });

        Promise.all(promises).then((pages) => {
            if (!this._mounted)
                return;
            const pageDimensions = new Map<number, {width: number, height: number}>();

            for (const page of pages) {
                const width = page.view[2] * this.scale;
                const height = page.view[3] * this.scale;
                pageDimensions.set(page.pageNumber, {width, height});
            }

            this.setState({ pageDimensions }, () => this.clearPageHeightCache());
        })
    };

    getPageHeight = (index: number) => {
        const { pageDimensions, responsiveScale } = this.state;
        const pageDimension = pageDimensions?.get(index + 1);
        if (pageDimension && responsiveScale)
            return (pageDimension.height / responsiveScale) + this.BORDER_WIDTH_OFFSET;
        return 768; // Initial page height
    };

    clearPageHeightCache = () => {
        this.listDiv?.resetAfterIndex(0);
    };

    computeResponsiveScale = (pageNumber: number) => {
        const node = this.pageRefs.get(pageNumber);
        const pageDimension = this.state.pageDimensions?.get(pageNumber);
        if (!node || !pageDimension) return;

        return pageDimension.height / node.clientHeight;
    };

    handleResize = () => {
        const { currentPage, responsiveScale } = this.state;

        // Recompute the responsive scale factor on window resize
        const newResponsiveScale = this.computeResponsiveScale(currentPage);

        if (newResponsiveScale && newResponsiveScale !== responsiveScale) {
            this.setState({ responsiveScale: newResponsiveScale }, () => this.clearPageHeightCache());
        }
        if (this.containerDiv)
            this.setState({ containerHeight: this.containerDiv.clientHeight });
    };

    debouncedHandleResize = debounce(this.handleResize, 500);

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

    onDocumentLoad = (pdf: pdfjs.PDFDocumentProxy) => {
        this.computePageDimensions(pdf);
        this.setState({ numPages: pdf.numPages });
    };

    updateCurrentVisiblePage = ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
        this.setState({ currentPage: visibleStopIndex + 1 });
    };

    render = () => {
        const { containerHeight, numPages } = this.state;
        return (
            <div
                ref={(ref) => this.containerDiv = ref}
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <Document
                    file={this.props.url}
                    onLoadSuccess={this.onDocumentLoad}
                    options={{removePageBorders: false}}
                >
                    {this.containerDiv && this.state.pageDimensions && (
                        <VariableSizeList
                            ref={(ref) => this.listDiv = ref}
                            height={containerHeight}
                            width={"100%"}
                            itemCount={numPages}
                            itemSize={this.getPageHeight}
                            itemData={{
                                pageRefs: this.pageRefs,
                                areaSelectionActivePage: this.state.areaSelectionActivePage,
                                pageDimensions: this.state.pageDimensions,
                                selectionMap: this.selectionMap,
                                enableAreaSelection: this.props.enableAreaSelection,
                                onAreaSelectionStart: this.onAreaSelectionStart,
                                onAreaSelectionEnd: this.onAreaSelectionEnd,
                            } as PdfPageData}
                            overscanCount={2}
                            onItemsRendered={this.updateCurrentVisiblePage}
                        >
                            {PdfPage}
                        </VariableSizeList>
                    )}
                </Document>
                {this.props.children}
            </div>
        );
    };
}
