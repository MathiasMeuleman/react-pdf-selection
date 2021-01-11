import {PDFDocumentProxy} from "pdfjs-dist";
// @ts-ignore-next-line
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer";

// import "pdfjs-dist/web/pdf_viewer.css";
import React, { Component } from "react";
// import "../style/pdf_viewer.css";
import "../style/react_pdf_viewer.css";
import {Document, Page, pdfjs} from "react-pdf";
import {debounce} from "../../dist/utils/debounce";
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
    url: string;
    pdfDocument?: PDFDocumentProxy;
    selections?: Array<SelectionType>;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onTextSelection?: (highlightTip?: NormalizedTextSelection) => void;
    onAreaSelection?: (highlightTip?: NormalizedAreaSelection) => void;
}

interface PdfViewerState {
    containerWidth?: number;
    containerNode?: HTMLDivElement;
    viewer?: ViewerType;
    pageHeights: number[];
    pageMargin: number;
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
        pageHeights: [],
        pageMargin: 0,
        textSelectionEnabled: true,
        numPages: 0,
    };
    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({ eventBus: this.eventBus });

    pdfContainerRefCallback = (ref: HTMLDivElement) => {
        if (ref) {
            this.setState({ containerNode: ref }, () => this.mountDocument());
        }
    };

    getPageOffset = (pageNumber: number) => {
        const { pageHeights, pageMargin } = this.state;
        return pageHeights.slice(0, pageNumber - 1).reduce((a, b) => a + b + pageMargin, 0);
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

            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
        };
    }

    rectsToLayout = (page: { node: HTMLElement; number: number }, rects: BoundingRect[]) => {
        return rects.map((rect) => {
            const style = getWindow(page.node).getComputedStyle(page.node);
            const offsetLeft = parseInt(style.borderLeftWidth, 10) + parseInt(style.paddingLeft, 10);
            const offsetTopPage = parseInt(style.borderTopWidth, 10) + parseInt(style.paddingTop, 10);
            const pageOffset = this.getPageOffset(page.number);
            const offsetTop = pageOffset > 0 ? pageOffset - this.state.pageMargin + offsetTopPage : offsetTopPage;
            return {...rect, left: rect.left + offsetLeft, top: rect.top + offsetTop};
        });
    };

    resize = () => {
        if (!this.state.viewer) return;
        const page = this.state.viewer.viewer.firstElementChild;
        if (!page) return;

        this.state.viewer.currentScaleValue = "page-width";
        const style = getWindow(page).getComputedStyle(page);
        const layoutProperties = ["marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"] as const;
        const pageMargin = layoutProperties.map((prop) => parseInt(style[prop], 10)).reduce((a, b) => a + b, 0);
        const pageHeights = Array.from(this.state.viewer.viewer.childNodes).map(
            (page) => (page as HTMLElement).clientHeight,
        );
        this.setState({ pageHeights, pageMargin });
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

        const pageOffset = this.getPageOffset(page.number);
        const rects = getClientRects(range, page.node);
        if (rects.length === 0) return;
        const pageRects = this.rectsToLayout(page, rects);

        const viewport = { width: page.node.clientWidth, height: page.node.clientHeight, pageOffset };
        const boundingRect = getBoundingRect(pageRects);
        const position = normalizePosition({ boundingRect, rects: pageRects, pageNumber: page.number }, viewport);
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
        const viewport = { width: page.node.clientWidth, height: page.node.clientHeight, pageOffset };
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
        const image = getAreaAsPNG(pageView.canvas, position.relative.boundingRect);
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

    // componentDidUpdate(prevProps: PdfViewerProps) {
    //     if (prevProps.pdfDocument !== this.props.pdfDocument) {
    //         this.mountDocument();
    //         return;
    //     }
    // }

    mountDocument = () => {
        this.removeEventListeners();
        const viewer =
            this.state.viewer ||
            (new PDFViewer({
                container: this.state.containerNode,
                eventBus: this.eventBus,
                enhanceTextSelection: true,
                linkService: this.linkService,
            }) as ViewerType);

        // this.linkService.setDocument(this.props.pdfDocument);
        this.linkService.setViewer(viewer);
        // viewer.setDocument(this.props.pdfDocument);

        this.setState({ viewer });
        this.addEventListeners();
        // debug
        (window as any).PdfViewer = this;
    };

    getPageViewport = (pageNumber: number) => {
        if (!this.state.viewer) return;
        const pageView = this.state.viewer.getPageView(pageNumber - 1);
        if (!pageView) return;
        return {
            ...pageView.viewport,
            pageOffset: this.getPageOffset(pageNumber),
        };
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

    // render = () => {
    //     const newAreaViewport = this.state.areaSelection?.position
    //         ? this.getPageViewport(this.state.areaSelection.position.pageNumber)
    //         : undefined;
    //     return (
    //         <div
    //             ref={this.pdfContainerRefCallback}
    //             className="pdfViewerContainer"
    //             style={{
    //                 position: "relative",
    //                 ...(this.state.textSelectionEnabled
    //                     ? {}
    //                     : {
    //                           userSelect: "none",
    //                           pointerEvents: "none",
    //                       }),
    //             }}
    //             onContextMenu={(e) => e.preventDefault()}
    //             onPointerDown={this.onMouseDown}
    //         >
    //             <div className="pdfViewer" />
    //             <div className="pdfViewer__area-selection">
    //                 {this.state.areaSelection?.position && newAreaViewport && (
    //                     <NewAreaSelection
    //                         position={viewportPosition(this.state.areaSelection.position, newAreaViewport)}
    //                     />
    //                 )}
    //             </div>
    //             <div>
    //                 {this.props.selections?.map((selection, i) => {
    //                     return this.renderSelection(selection, i);
    //                 })}
    //             </div>
    //             {this.props.children}
    //         </div>
    //     );
    // };

    /** Total left and right border width, needed as offset to avoid PageCanvas rendering past right page border. */
    BORDER_WIDTH_OFFSET = 18;

    containerDiv: HTMLElement | null = null;

    componentDidMount = () => {
        document.defaultView?.addEventListener("resize", this.debouncedSetContainerWidth);
    };

    componentWillUnmount = () => {
        document.defaultView?.removeEventListener("resize", this.debouncedSetContainerWidth);
    };

    setContainerWidth = () => {
        if (!this.containerDiv) return;
        this.setState({containerWidth: this.containerDiv.getBoundingClientRect().width - this.BORDER_WIDTH_OFFSET});
    };

    debouncedSetContainerWidth = debounce(this.setContainerWidth, 500);

    removeTextLayerOffset = (pageNumber: number) => {
        const textLayer = document.querySelectorAll<HTMLElement>(".react-pdf__Page__textContent")[pageNumber - 1];
        if (!textLayer) return;
        const { style } = textLayer;
        style.top = "0";
        style.left = "0";
        style.transform = "";
    };

    onDocumentLoad = ({ numPages }: PDFDocumentProxy) => {
        this.setState({numPages});
    };

    onPageLoad = (page: pdfjs.PDFPageProxy) => {
        this.removeTextLayerOffset(page.pageNumber);
        this.setContainerWidth();
    };

    render = () => {
        return (
            <div
                ref={(ref) => this.containerDiv = ref}
                style={{
                    position: "relative",
                    width: "100%",
                }}
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
                                <Page
                                    key={`page_${index + 1}`}
                                    pageNumber={index + 1}
                                    onLoadSuccess={this.onPageLoad}
                                    width={this.state.containerWidth}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: 100,
                                            height: 100,
                                            background: "rgba(255, 226, 143, 1)",
                                            mixBlendMode: "multiply",
                                        }}
                                    />
                                </Page>
                            ),
                        )
                    }
                </Document>
            </div>
        );
    };
}
