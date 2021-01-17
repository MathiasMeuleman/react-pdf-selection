import React, { Component, ComponentType, createRef, CSSProperties, ReactElement, RefObject } from "react";
import isEqual from "react-fast-compare";
import { Document, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "../style/react_pdf_viewer.css";
import { NormalizedAreaSelection, NormalizedTextSelection, SelectionType } from "../types";
import { generateUuid, getBoundingRect, getClientRects, getPageFromRange, getWindow } from "../utils";
import { normalizePosition } from "../utils/coordinates";
import { AreaSelectionProps } from "./AreaSelection";
import { NewAreaSelectionProps } from "./NewAreaSelection";
import { PageLoader } from "./PageLoader";
import { PdfPage } from "./PdfPage";
import { PlaceholderPage } from "./PlaceholderPage";
import { TextSelectionProps } from "./TextSelection";

export type PageDimensions = Map<number, { width: number; height: number }>;

interface PdfViewerProps {
    children?: (props: { document: ReactElement }) => ReactElement;
    loading?: string | ReactElement | (() => ReactElement);
    url: string;
    selections?: Array<SelectionType>;
    scale: number;
    overscanCount: number;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
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
    textSelectionComponent?: ComponentType<TextSelectionProps>;
    areaSelectionComponent?: ComponentType<AreaSelectionProps>;
    newAreaSelectionComponent?: ComponentType<NewAreaSelectionProps>;
}

interface PdfViewerState {
    documentUuid?: string;
    textSelectionEnabled: boolean;
    areaSelectionActivePage?: number;
    numPages: number;
    originalPageDimensions?: PageDimensions;
    pageDimensions?: PageDimensions;
    pageYOffsets?: number[];
    visiblePages?: number[];
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {
    static defaultProps = {
        overscanCount: 1,
        scale: 1.2,
    };

    state: PdfViewerState = {
        textSelectionEnabled: true,
        numPages: 0,
    };

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 11;
    TOP_WIDTH_OFFSET = 10;

    containerDiv: HTMLElement | null = null;

    pageRefs: Map<number, RefObject<HTMLDivElement>> = new Map();

    selectionMap: Map<number, SelectionType[]> | undefined;

    _mounted: boolean = false;

    /**
     * Lifecycle function
     */

    componentDidMount = () => {
        this._mounted = true;
        this.computeSelectionMap();
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("selectstart", this.onTextSelectionStart);
        document.addEventListener("selectionchange", this.onTextSelectionChange);
        document.addEventListener("scroll", this.onScroll);

        // debug
        (window as any).PdfViewer = this;
    };

    componentDidUpdate = (prevProps: PdfViewerProps) => {
        if (this.props.selections !== prevProps.selections) this.computeSelectionMap();
        if (this.props.url !== prevProps.url) this.setState({ documentUuid: undefined });
        if (this.props.scale !== prevProps.scale && this.state.originalPageDimensions)
            this.computeScaledPageDimensions(this.state.originalPageDimensions);
    };

    componentWillUnmount = () => {
        this._mounted = false;
        document.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("selectstart", this.onTextSelectionStart);
        document.removeEventListener("selectionchange", this.onTextSelectionChange);
        document.removeEventListener("scroll", this.onScroll);
    };

    shouldComponentUpdate = (nextProps: Readonly<PdfViewerProps>, nextState: Readonly<PdfViewerState>) => {
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
            this.selectionMap = undefined;
            return;
        }
        const selectionMap: Map<number, SelectionType[]> = new Map();
        this.props.selections.forEach((selection) => {
            selectionMap.set(selection.position.pageNumber, [
                ...(selectionMap.get(selection.position.pageNumber) ?? []),
                selection,
            ]);
        });
        this.selectionMap = selectionMap;
    };

    computePageDimensions = (pdf: pdfjs.PDFDocumentProxy) => {
        const promises = Array.from({ length: pdf.numPages })
            .map((x, i) => i + 1)
            .map((pageNumber) => {
                return new Promise<pdfjs.PDFPageProxy>((resolve, reject) => {
                    pdf.getPage(pageNumber).then(resolve, reject);
                });
            });

        Promise.all(promises).then((pages) => {
            if (!this._mounted) return;
            const originalPageDimensions: PageDimensions = new Map();

            for (const page of pages) {
                const width = page.view[2];
                const height = page.view[3];
                originalPageDimensions.set(page.pageNumber, { width, height });
            }

            this.computeScaledPageDimensions(originalPageDimensions);
            this.setState({ originalPageDimensions });
        });
    };

    computeScaledPageDimensions = (originalPageDimensions: PageDimensions) => {
        const pageDimensions: PageDimensions = new Map();
        const pageYOffsets: number[] = new Array(originalPageDimensions.size);
        pageYOffsets[0] = this.TOP_WIDTH_OFFSET;

        originalPageDimensions.forEach((dimension, pageNumber) => {
            const width = dimension.width * this.props.scale;
            const height = dimension.height * this.props.scale;
            pageDimensions.set(pageNumber, { width, height });
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
        const firstVisiblePageIdx = pageOffsets.findIndex((offset) => offset > scrollTop);
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
        const pageDimension = { width: page.node.clientWidth, height: page.node.clientHeight };

        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;

        const boundingRect = getBoundingRect(rects);
        const position = normalizePosition({ boundingRect, rects, pageNumber: page.number }, pageDimension);
        const text = Array.from(range.cloneContents().childNodes)
            .map((node) => node.textContent)
            .join(" ");

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
        if (event.key === "Escape") this.resetSelections();
    };

    onMouseDown = () => {
        this.resetSelections();
    };

    onScroll = (event: Event) => {
        if (!this.containerDiv || !this.state.pageYOffsets) return;
        const scrollElement = (event.target as HTMLDocument | undefined)?.scrollingElement;
        if (!scrollElement) return;
        const visiblePages = this.getVisiblePages(scrollElement as HTMLElement);
        this.setState({ visiblePages });
    };

    onDocumentLoad = (pdf: pdfjs.PDFDocumentProxy) => {
        this.computePageDimensions(pdf);
        this.setState({ numPages: pdf.numPages, documentUuid: generateUuid() });
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
                pageDimensions: this.state.pageDimensions?.get(pageNumber),
                selections: this.selectionMap?.get(pageNumber),
                enableAreaSelection: this.props.enableAreaSelection,
                onAreaSelectionStart: this.onAreaSelectionStart,
                onAreaSelectionEnd: this.onAreaSelectionEnd,
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
                <style>
                    {`
                        .react-pdf__Page__textContent span::selection {
                            background-color: ${this.props.textSelectionColor ?? "blue"};
                    `}
                </style>
                <Document
                    className={this.state.textSelectionEnabled ? "" : "no-select"}
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
