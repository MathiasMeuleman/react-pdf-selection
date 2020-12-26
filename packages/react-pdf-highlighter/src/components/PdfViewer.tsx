import debounce from "lodash.debounce";
import {PDFDocumentProxy} from "pdfjs-dist";
// @ts-ignore-next-line
import {EventBus, PDFViewer, PDFLinkService} from "pdfjs-dist/web/pdf_viewer";
import React, {PureComponent, ReactElement} from "react";
import ReactDom from "react-dom";
import {
    BoundingRect,
    EventBus as EventBusType,
    Highlight,
    LinkService as LinkServiceType, Position,
    Scaled,
    ScaledPosition,
    Viewer as ViewerType,
    ViewportHighlight,
} from "../types";
import {
    findOrCreateContainerLayer, getBoundingRect,
    getClientRects,
    getPageFromRange,
    getWindow,
    scaledToViewport,
    viewportToScaled,
} from "../utils";

import "pdfjs-dist/web/pdf_viewer.css";

type PdfViewerState = {
    ghostHighlight?: {
        position: ScaledPosition
    },
    isCollapsed: boolean,
        range?: Range,
        tip?: {
        highlight: ViewportHighlight,
        callback: (highlight: ViewportHighlight) => ReactElement,
    },
    isAreaSelectionInProgress: boolean,
    scrolledToHighlightId: string
};

type PdfViewerProps = {
    highlightTransform: (
        highlight: ViewportHighlight,
        index: number,
        setTip: (
            highlight: ViewportHighlight,
            callback: (highlight: ViewportHighlight) => ReactElement,
        ) => void,
        hideTip: () => void,
        viewportToScaled: (rect: BoundingRect) => Scaled,
        screenshot: (position: BoundingRect) => string,
        isScrolledTo: boolean
    ) => ReactElement,
    highlights: Array<Highlight>,
    onScrollChange: () => void,
    scrollRef: (scrollTo: (highlight: Highlight) => void) => void,
    pdfDocument: PDFDocumentProxy,
    pdfScaleValue: string,
    onSelectionFinished?: (
        position: ScaledPosition,
        content: { text?: string, image?: string },
        hideTipAndSelection: () => void,
        transformSelection: () => void
    ) => ReactElement | undefined,
    enableAreaSelection: (event: MouseEvent) => boolean
};

const EMPTY_ID = "empty-id";

class PdfHighlighter extends PureComponent<PdfViewerProps, PdfViewerState> {
    static defaultProps = {
        pdfScaleValue: "auto"
    };

    state: PdfViewerState = {
        isCollapsed: true,
        scrolledToHighlightId: EMPTY_ID,
        isAreaSelectionInProgress: false,
    };

    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({
        eventBus: this.eventBus
    });
    viewer?: ViewerType = undefined;

    resizeObserver? = null;
    containerNode: HTMLDivElement | null = null;
    unsubscribe = () => {};

    constructor(props: PdfViewerProps) {
        super(props);
        // if (typeof ResizeObserver !== "undefined") {
        //     this.resizeObserver = new ResizeObserver(this.debouncedScaleValue);
        // }
    }

    componentDidMount() {
        this.init();
    }

    attachRef = (ref: HTMLDivElement | null) => {
        const { eventBus, resizeObserver: observer } = this;
        this.containerNode = ref;
        this.unsubscribe();

        if (ref) {
            const { ownerDocument: document } = ref;
            eventBus.on("textlayerrendered", this.onTextLayerRendered);
            eventBus.on("pagesinit", this.onDocumentReady);
            document.addEventListener("selectionchange", this.onSelectionChange);
            document.addEventListener("keydown", this.handleKeyDown);
            document.defaultView?.addEventListener("resize", this.debouncedScaleValue);
            // if (observer) observer.observe(ref);

            this.unsubscribe = () => {
                eventBus.off("pagesinit", this.onDocumentReady);
                eventBus.off("textlayerrendered", this.onTextLayerRendered);
                document.removeEventListener("selectionchange", this.onSelectionChange);
                document.removeEventListener("keydown", this.handleKeyDown);
                document.defaultView?.removeEventListener("resize", this.debouncedScaleValue);
                // if (observer) observer.disconnect();
            };
        }
    };

    componentDidUpdate(prevProps: PdfViewerProps) {
        if (prevProps.pdfDocument !== this.props.pdfDocument) {
            this.init();
            return;
        }
        if (prevProps.highlights !== this.props.highlights) {
            this.renderHighlights(this.props);
        }
    }

    init() {
        const { pdfDocument } = this.props;

        this.viewer =
            (this.viewer ||
            new PDFViewer({
                container: this.containerNode,
                eventBus: this.eventBus,
                enhanceTextSelection: true,
                removePageBorders: true,
                linkService: this.linkService
            }) as ViewerType);

        this.linkService.setDocument(pdfDocument);
        this.linkService.setViewer(this.viewer);
        this.viewer.setDocument(pdfDocument);

        // debug
        // window.PdfViewer = this;
    }

    componentWillUnmount() {
        this.unsubscribe();
    }

    findOrCreateHighlightLayer(page: number) {
        const { textLayer } = this.viewer?.getPageView(page - 1) || {};

        if (!textLayer) {
            return null;
        }

        return findOrCreateContainerLayer(
            textLayer.textLayerDiv,
            "PdfHighlighter__highlight-layer"
        );
    }

    groupHighlightsByPage(
        highlights: Array<Highlight>
    ): { [pageNumber: string]: Array<Highlight> } {
        const { ghostHighlight } = this.state;

        return ([...highlights, ghostHighlight]
            .filter(Boolean) as Array<Highlight>)
            .reduce((res: { [key: number]: Array<Highlight> }, highlight: Highlight) => {
                const { pageNumber } = highlight.position;
                res[pageNumber] = res[pageNumber] || [];
                res[pageNumber].push(highlight);
                return res;
            }, {});
    }

    showTip(highlight: ViewportHighlight, content: ReactElement) {
        const {
            isCollapsed,
            ghostHighlight,
            isAreaSelectionInProgress
        } = this.state;

        const highlightInProgress = !isCollapsed || ghostHighlight;

        if (highlightInProgress || isAreaSelectionInProgress) {
            return;
        }

        this.renderTipAtPosition(highlight.position, content);
    }

    scaledPositionToViewport({
        pageNumber,
        boundingRect,
        rects,
        usePdfCoordinates
    }: ScaledPosition): Position {
        const viewport = this.viewer!.getPageView(pageNumber - 1).viewport;

        return {
            boundingRect: scaledToViewport(boundingRect, viewport, usePdfCoordinates),
            rects: (rects || []).map(rect =>
                scaledToViewport(rect, viewport, usePdfCoordinates)
            ),
            pageNumber
        };
    }

    viewportPositionToScaled({
        pageNumber,
        boundingRect,
        rects
    }: Position): ScaledPosition {
        const viewport = this.viewer!.getPageView(pageNumber - 1).viewport;

        return {
            boundingRect: viewportToScaled(boundingRect, viewport),
            rects: (rects || []).map(rect => viewportToScaled(rect, viewport)),
            pageNumber
        };
    }

    screenshot(position: BoundingRect, pageNumber: number) {
        const canvas = this.viewer!.getPageView(pageNumber - 1).canvas;

        // return getAreaAsPng(canvas, position);
        return "";
    }

    renderHighlights(nextProps?: PdfViewerProps) {
        const { highlightTransform, highlights } = nextProps || this.props;

        const { pdfDocument } = this.props;

        const { tip, scrolledToHighlightId } = this.state;

        const highlightsByPage = this.groupHighlightsByPage(highlights);

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
            const highlightLayer = this.findOrCreateHighlightLayer(pageNumber);

            if (highlightLayer) {
                ReactDom.render(
                    <div>
                        {(highlightsByPage[String(pageNumber)] || []).map(
                            ({ position, id, ...highlight }, index) => {
                                const viewportHighlight: ViewportHighlight = {
                                    id,
                                    position: this.scaledPositionToViewport(position),
                                    ...highlight
                                };

                                if (tip && tip.highlight.id === String(id)) {
                                    this.showTip(tip.highlight, tip.callback(viewportHighlight));
                                }

                                const isScrolledTo = Boolean(scrolledToHighlightId === id);

                                return highlightTransform(
                                    viewportHighlight,
                                    index,
                                    (highlight, callback) => {
                                        this.setState({
                                            tip: { highlight, callback }
                                        });

                                        this.showTip(highlight, callback(highlight));
                                    },
                                    this.hideTipAndSelection,
                                    rect => {
                                        const viewport = this.viewer!.getPageView(pageNumber - 1)
                                            .viewport;

                                        return viewportToScaled(rect, viewport);
                                    },
                                    boundingRect => this.screenshot(boundingRect, pageNumber),
                                    isScrolledTo
                                );
                            }
                        )}
                    </div>,
                    highlightLayer
                );
            }
        }
    }

    hideTipAndSelection = () => {
        const tipNode = findOrCreateContainerLayer(
            this.viewer!.viewer,
            "PdfHighlighter__tip-layer"
        );

        ReactDom.unmountComponentAtNode(tipNode);

        this.setState({ ghostHighlight: undefined, tip: undefined }, () =>
            this.renderHighlights()
        );
    };

    renderTipAtPosition(position: Position, inner?: ReactElement) {
        const { boundingRect, pageNumber } = position;

        const page = {
            node: this.viewer!.getPageView(pageNumber - 1).div
        };

        const pageBoundingRect = page.node.getBoundingClientRect();

        const tipNode = findOrCreateContainerLayer(
            this.viewer!.viewer,
            "PdfHighlighter__tip-layer"
        );

        // ReactDom.render(
        //     <TipContainer
        //         scrollTop={this.viewer!.container.scrollTop}
        //         pageBoundingRect={pageBoundingRect}
        //         style={{
        //             left:
        //                 page.node.offsetLeft + boundingRect.left + boundingRect.width / 2,
        //             top: boundingRect.top + page.node.offsetTop,
        //             bottom: boundingRect.top + page.node.offsetTop + boundingRect.height
        //         }}
        //         children={inner}
        //     />,
        //     tipNode
        // );
    }

    onTextLayerRendered = () => {
        this.renderHighlights();
    };

    scrollTo = (highlight: Highlight) => {
        const { pageNumber, boundingRect, usePdfCoordinates } = highlight.position;
        if (!this.viewer) return;

        this.viewer.container.removeEventListener("scroll", this.onScroll);

        const pageViewport = this.viewer.getPageView(pageNumber - 1).viewport;
        if (!pageViewport) return;

        const scrollMargin = 10;

        this.viewer?.scrollPageIntoView({
            pageNumber,
            destArray: [
                null,
                { name: "XYZ" },
                ...pageViewport.convertToPdfPoint(
                    0,
                    scaledToViewport(boundingRect, pageViewport, usePdfCoordinates).top -
                    scrollMargin
                ),
                0
            ]
        });

        this.setState(
            {
                scrolledToHighlightId: highlight.id
            },
            () => this.renderHighlights()
        );

        // wait for scrolling to finish
        setTimeout(() => {
            this.viewer?.container.addEventListener("scroll", this.onScroll);
        }, 100);
    };

    onDocumentReady = () => {
        const { scrollRef } = this.props;

        this.handleScaleValue();

        scrollRef(this.scrollTo);
    };

    onSelectionChange = () => {
        const container = this.containerNode;
        const selection = getWindow(container).getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (selection?.isCollapsed) {
            this.setState({ isCollapsed: true });
            return;
        }

        if (
            !range ||
            !container ||
            !container.contains(range.commonAncestorContainer)
        ) {
            return;
        }

        this.setState({
            isCollapsed: false,
            range
        });

        this.debouncedAfterSelection();
    };

    onScroll = () => {
        const { onScrollChange } = this.props;

        onScrollChange();

        this.setState(
            {
                scrolledToHighlightId: EMPTY_ID
            },
            () => this.renderHighlights()
        );

        this.viewer?.container.removeEventListener("scroll", this.onScroll);
    };

    onMouseDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.closest(".PdfHighlighter__tip-container")) {
            return;
        }

        this.hideTipAndSelection();
    };

    handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Escape") {
            this.hideTipAndSelection();
        }
    };

    afterSelection = () => {
        const { onSelectionFinished } = this.props;

        const { isCollapsed, range } = this.state;

        if (!range || isCollapsed) {
            return;
        }

        const page = getPageFromRange(range);

        if (!page) {
            return;
        }

        const rects = getClientRects(range, page.node);

        if (rects.length === 0) {
            return;
        }

        const boundingRect = getBoundingRect(rects);

        const viewportPosition = { boundingRect, rects, pageNumber: page.number };

        const content = {
            text: range.toString()
        };
        const scaledPosition = this.viewportPositionToScaled(viewportPosition);

        this.renderTipAtPosition(
            viewportPosition,
            onSelectionFinished?.(
                scaledPosition,
                content,
                () => this.hideTipAndSelection(),
                () =>
                    this.setState(
                        {
                            ghostHighlight: { position: scaledPosition }
                        },
                        () => this.renderHighlights()
                    )
            )
        );
    };

    debouncedAfterSelection: () => void = debounce(this.afterSelection, 500);

    toggleTextSelection(flag: boolean) {
        this.viewer?.viewer.classList.toggle(
            "PdfHighlighter--disable-selection",
            flag
        );
    }

    handleScaleValue = () => {
        if (this.viewer) {
            this.viewer.currentScaleValue = this.props.pdfScaleValue; //"page-width";
        }
    };

    debouncedScaleValue: () => void = debounce(this.handleScaleValue, 500);

    render() {
        const { onSelectionFinished, enableAreaSelection } = this.props;

        return (
            <div
                ref={this.attachRef}
                className="pdfViewerContainer"
                style={{
                    height: "100%",
                    overflow: "auto",
                    position: "absolute",
                    width: "100%",
                }}
                onContextMenu={e => e.preventDefault()}
                onPointerDown={this.onMouseDown}
            >
                <div className="pdfViewer" />
            </div>
        );
    }
}

export default PdfHighlighter;
