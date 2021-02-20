import React, {Component, createRef, CSSProperties, ReactElement, RefObject} from "react";
import isEqual from "react-fast-compare";
import {Document, pdfjs} from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "../style/react_pdf_viewer.css";
import {NormalizedAreaSelection, NormalizedTextSelection, SelectionType} from "../types";
import {generateUuid, getBoundingRect, getClientRects, getPageFromRange, getWindow} from "../utils";
import {normalizePosition} from "../utils/coordinates";
import {AreaSelectionProps} from "./AreaSelection";
import {NewAreaSelectionProps} from "./NewAreaSelection";
import {PageLoader} from "./PageLoader";
import {PdfPage} from "./PdfPage";
import {PlaceholderPage} from "./PlaceholderPage";
import {TextSelectionProps} from "./TextSelection";

export enum SelectionMode {
    AREA,
    TEXT,
}

export enum PDFOrientation {
    PORTRAIT = "portrait",
    LANDSCAPE = "landscape",
}

export type PageDimension = { width: number; height: number; orientation: PDFOrientation };
export type PageDimensions = Map<number, PageDimension>;

interface PdfViewerProps<D extends object> {
    children?: (props: { document: ReactElement }) => ReactElement;
    loading?: string | ReactElement | (() => ReactElement);
    url: string;
    selections?: Array<SelectionType<D>>;
    scale: number;
    overscanCount: number;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onLoad?: (originalPageDimensions: PageDimensions) => void;
    onPageDimensions?: ({
        pageDimensions,
        pageYOffsets,
    }: {
        pageDimensions: PageDimensions;
        pageYOffsets: number[];
    }) => void;
    onTextSelection?: (highlightTip?: NormalizedTextSelection) => void;
    onAreaSelection?: (highlightTip?: NormalizedAreaSelection) => void;
    textSelectionColor?: CSSProperties["color"];
    textSelectionComponent?: (props: TextSelectionProps<D>) => JSX.Element;
    areaSelectionComponent?: (props: AreaSelectionProps<D>) => JSX.Element;
    newAreaSelectionComponent?: (props: NewAreaSelectionProps) => JSX.Element;
}

interface PdfViewerState<D extends object> {
    documentUuid?: string;
    activeSelectionMode: SelectionMode;
    textSelectionActive: boolean;
    areaSelectionActivePage?: number;
    selectionMap?: Map<number, SelectionType<D>[]>;
    numPages: number;
    originalPageDimensions?: PageDimensions;
    pageDimensions?: PageDimensions;
    pageYOffsets?: number[];
    visiblePages?: number[];
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class PdfViewer<D extends object> extends Component<PdfViewerProps<D>, PdfViewerState<D>> {
    static defaultProps = {
        overscanCount: 1,
        scale: 1.2,
    };

    state: PdfViewerState<D> = {
        activeSelectionMode: SelectionMode.TEXT,
        textSelectionActive: false,
        numPages: 0,
    };

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 11;
    TOP_WIDTH_OFFSET = 10;

    containerDiv: HTMLElement | null = null;

    scrollingElement: HTMLElement | null = null;

    pageRefs: Map<number, RefObject<HTMLDivElement>> = new Map();

    _mounted: boolean = false;

    /**
     * Lifecycle function
     */

    componentDidMount = () => {
        this._mounted = true;
        this.computeSelectionMap();
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("scroll", this.onScroll);

        // debug
        (window as any).PdfViewer = this;
    };

    componentDidUpdate = (prevProps: PdfViewerProps<D>) => {
        if (this.props.selections !== prevProps.selections) this.computeSelectionMap();
        if (this.props.url !== prevProps.url) this.setState({ documentUuid: undefined });
        if (this.props.scale !== prevProps.scale && this.state.originalPageDimensions)
            this.computeScaledPageDimensions(this.state.originalPageDimensions);
    };

    componentWillUnmount = () => {
        this._mounted = false;
        document.removeEventListener("keydown", this.onKeyDown);
        this.scrollingElement?.removeEventListener("scroll", this.onScroll);
        this.containerDiv?.removeEventListener("selectstart", this.onTextSelectionStart);
        document.removeEventListener("selectionchange", this.onTextSelectionChange);
    };

    shouldComponentUpdate = (nextProps: Readonly<PdfViewerProps<D>>, nextState: Readonly<PdfViewerState<D>>) => {
        return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState);
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
            this.state.selectionMap = undefined;
            return;
        }
        const selectionMap: Map<number, SelectionType<D>[]> = new Map();
        this.props.selections.forEach((selection) => {
            selectionMap.set(selection.position.pageNumber, [
                ...(selectionMap.get(selection.position.pageNumber) ?? []),
                selection,
            ]);
        });
        this.setState({ selectionMap });
    };

    computePageDimensions = async (pdf: pdfjs.PDFDocumentProxy) => {
        const pages = await Promise.all(Array.from({length: pdf.numPages})
            .map((x, i) => i + 1)
            .map((pageNumber) => {
                return new Promise<pdfjs.PDFPageProxy>((resolve, reject) => {
                    pdf.getPage(pageNumber).then(resolve, reject);
                });
            }));

        if (!this._mounted) return;
        const originalPageDimensions: PageDimensions = new Map();

        for (const page of pages) {
            const width = page.view[2];
            const height = page.view[3];
            const orientation = page.rotate === 90 ? PDFOrientation.LANDSCAPE : PDFOrientation.PORTRAIT;
            originalPageDimensions.set(page.pageNumber, { width, height, orientation });
        }

        this.computeScaledPageDimensions(originalPageDimensions);
        this.setState({ originalPageDimensions });
        return originalPageDimensions;
    };

    computeScaledPageDimensions = (originalPageDimensions: PageDimensions) => {
        if (!this.containerDiv) return;
        const pageDimensions: PageDimensions = new Map();
        const pageYOffsets: number[] = new Array(originalPageDimensions.size);
        pageYOffsets[0] = (this.containerDiv.offsetTop ?? 0) + this.TOP_WIDTH_OFFSET;

        originalPageDimensions.forEach((dimension, pageNumber) => {
            const width = dimension.width * this.props.scale;
            const height = dimension.height * this.props.scale;
            pageDimensions.set(pageNumber, { width, height, orientation: dimension.orientation });
            if (pageNumber < originalPageDimensions.size)
                pageYOffsets[pageNumber] = pageYOffsets[pageNumber - 1] + height + this.BORDER_WIDTH_OFFSET;
        });

        const visiblePages = this.getVisiblePages(document.documentElement, pageYOffsets);

        this.setState({ pageDimensions, pageYOffsets, visiblePages });
        this.props.onPageDimensions?.({ pageDimensions, pageYOffsets });
    };

    getVisiblePages = (scrollElement: HTMLElement, pageYOffsets?: number[]) => {
        const pageOffsets = pageYOffsets ?? this.state.pageYOffsets;
        if (!pageOffsets) return [];
        const { scrollTop, clientHeight } = scrollElement;
        const firstVisiblePageIdx =
            scrollTop > pageOffsets[pageOffsets.length - 1]
                ? pageOffsets.length - 1
                : pageOffsets.findIndex((offset) => offset > scrollTop);
        const lastVisiblePageIds =
            scrollTop + clientHeight > pageOffsets[pageOffsets.length - 1]
                ? pageOffsets.length - 1
                : pageOffsets.findIndex((offset) => offset > scrollTop + clientHeight);
        const underScanPages = Array.from({ length: Math.min(this.props.overscanCount, firstVisiblePageIdx) }).map(
            (_, i) => firstVisiblePageIdx - i - 1,
        );
        const overScanPages = Array.from({
            length: Math.min(this.props.overscanCount, this.state.numPages - lastVisiblePageIds - 1),
        }).map((_, i) => i + lastVisiblePageIds + 1);
        const visibleCount = lastVisiblePageIds - firstVisiblePageIdx + 1;
        const visiblePages = Array.from({ length: visibleCount }).map((x, i) => i + firstVisiblePageIdx);
        return [...underScanPages, ...visiblePages, ...overScanPages];
    };

    getItemKey = (index: number) => {
        return `doc_${this.state.documentUuid}_page_${index}`;
    };

    getPageRef = (pageNumber: number) => {
        let ref = this.pageRefs.get(pageNumber);
        if (!ref) {
            ref = createRef<HTMLDivElement>();
            this.pageRefs.set(pageNumber, ref);
        }
        return ref;
    };

    /**
     * Text selection handlers
     */

    clearTextSelection = () => {
        getWindow(this.containerDiv).getSelection()?.removeAllRanges();
        if (this.state.textSelectionActive) {
            this.setState({ textSelectionActive: false });
            this.props.onTextSelection?.();
        }
    };

    onTextSelectionStart = () => {
        this.clearAreaSelection();
    };

    onTextSelectionChange = () => {
        if (this.state.activeSelectionMode !== SelectionMode.TEXT) return;
        const selection = getWindow(this.containerDiv).getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
        if (!range) return;

        const page = getPageFromRange(range);
        if (!page) return;
        const pageDimension = { width: page.node.clientWidth, height: page.node.clientHeight };

        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;

        const boundingRect = getBoundingRect(rects);
        const position = normalizePosition({ boundingRect, rects, pageNumber: page.number }, pageDimension);
        const text = Array.from(range.cloneContents().childNodes)
            .map((node) => node.textContent)
            .join(" ");

        this.setState({ textSelectionActive: true });
        this.props.onTextSelection?.({ position, text });
    };

    /**
     * Area selection handlers
     */

    clearAreaSelection = () => {
        if (this.state.areaSelectionActivePage) {
            this.setState({ areaSelectionActivePage: undefined });
            this.props.onAreaSelection?.();
        }
    };

    onAreaSelectionChange = (pageNumber: number) => {
        this.setState({ areaSelectionActivePage: pageNumber });
    };

    onAreaSelectionEnd = (selection: NormalizedAreaSelection) => {
        this.props.onAreaSelection?.(selection);
    };

    /**
     * Event handlers
     */

    getScrollParent = (node: HTMLElement): HTMLElement => {
        const overflowY = window.getComputedStyle(node).overflowY;
        const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

        if (isScrollable && node.scrollHeight >= node.clientHeight) {
            return node;
        }

        return node.parentElement ? this.getScrollParent(node.parentElement) : document.body;
    }

    onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") this.resetSelections();
    };

    onMouseDown = (event: React.MouseEvent) => {
        this.resetSelections();
        this.setState({
            activeSelectionMode: this.props.enableAreaSelection?.(event)
                ? SelectionMode.AREA
                : SelectionMode.TEXT ?? SelectionMode.TEXT,
        });
    };

    onScroll = () => {
        if (!this.scrollingElement || !this.state.pageYOffsets) return;
        const visiblePages = this.getVisiblePages(this.scrollingElement);
        this.setState({ visiblePages });
    };

    onDocumentLoad = async (pdf: pdfjs.PDFDocumentProxy) => {
        const pageDimensions = await this.computePageDimensions(pdf);
        this.setState({ numPages: pdf.numPages, documentUuid: generateUuid() });
        if (this.containerDiv) {
            this.scrollingElement = this.getScrollParent(this.containerDiv);
            this.scrollingElement.addEventListener("scroll", this.onScroll);
            this.containerDiv?.addEventListener("selectstart", this.onTextSelectionStart);
        }
        // SelectionChange event listener does not work on div, only on document?
        document.addEventListener("selectionchange", this.onTextSelectionChange);
        if (pageDimensions)
            this.props.onLoad?.(pageDimensions);
    };

    renderPages = () => {
        return Array.from(new Array(this.state.numPages), (el, i) => {
            const pageNumber = i + 1;
            if (!this.state.visiblePages || !this.state.visiblePages.includes(i))
                return (
                    <PlaceholderPage
                        key={this.getItemKey(i)}
                        pageDimensions={this.state.pageDimensions?.get(pageNumber)}
                    />
                );
            const props = {
                style: {},
                pageNumber,
                innerRef: this.getPageRef(pageNumber),
                areaSelectionActive: this.state.areaSelectionActivePage === pageNumber,
                enableAreaSelection: this.props.enableAreaSelection,
                pageDimensions: this.state.pageDimensions?.get(pageNumber),
                selections: this.state.selectionMap?.get(pageNumber),
                onAreaSelectionChange: this.onAreaSelectionChange,
                onAreaSelectionEnd: this.onAreaSelectionEnd,
                textSelectionColor: this.props.textSelectionColor ?? "#0000ff33",
                areaSelectionComponent: this.props.areaSelectionComponent,
                textSelectionComponent: this.props.textSelectionComponent,
                newAreaSelectionComponent: this.props.newAreaSelectionComponent,
            };
            return <PdfPage key={this.getItemKey(i)} {...props} />;
        });
    };

    render = () => {
        const loading = this.props.loading ?? <PageLoader />;
        const document: ReactElement = (
            <div
                ref={(ref) => (this.containerDiv = ref)}
                style={{
                    position: "relative",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <Document
                    className={this.state.activeSelectionMode === SelectionMode.TEXT ? "" : "no-select"}
                    file={this.props.url}
                    loading={loading}
                    onLoadSuccess={this.onDocumentLoad}
                >
                    {this.containerDiv && this.state.documentUuid && this.state.pageDimensions && this.renderPages()}
                </Document>
            </div>
        );
        return this.props.children ? this.props.children({ document }) : document;
    };
}
