import React, {Component, createRef} from "react";
import {Page} from "react-pdf";
import {BoundingRect, NewAreaSelection, NormalizedAreaSelection, NormalizedPosition, SelectionType} from "../index";
import {getAreaAsPNG, getWindow} from "../utils";
import {normalizePosition} from "../utils/coordinates";
import {AreaSelection} from "./AreaSelection";
import {Coords, isAreaSelection} from "./PdfViewer";
import {TextSelection} from "./TextSelection";

interface PdfPageProps {
    pageNumber: number;
    width?: number;
    selections?: SelectionType[];
    areaSelectionActive: boolean;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onAreaSelectionStart?: (pageNumber: number) => void;
    onAreaSelectionEnd?: (selection: NormalizedAreaSelection) => void;
}

interface PdfPageState {
    pageDimensions?: { width: number; height: number };
    renderComplete: boolean;
    areaSelection?: {
        originTarget?: HTMLElement;
        start?: Coords;
        position?: NormalizedPosition;
        locked?: boolean;
    };
}

export class PdfPage extends Component<PdfPageProps, PdfPageState> {

    state: PdfPageState = {
        renderComplete: false,
    };
    inputRef = createRef<HTMLDivElement>();

    containerCoords = (pageX: number, pageY: number) => {
        if (!this.inputRef.current) return;
        const pageBoundingBox = this.inputRef.current.getBoundingClientRect();
        const window = getWindow(this.inputRef.current);

        return {
            x: pageX - (pageBoundingBox.left + window.scrollX),
            y: pageY - (pageBoundingBox.top + window.scrollY),
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

    onAreaSelectStart = (event: React.MouseEvent) => {
        this.props.onAreaSelectionStart?.(this.props.pageNumber);
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
        if (!this.state.pageDimensions) return;

        const boundingRect = this.getBoundingRect(areaSelection.start, end);
        return normalizePosition(
            { boundingRect, rects: [boundingRect], pageNumber: this.props.pageNumber },
            this.state.pageDimensions,
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
        const position = this.getAreaSelectionPosition(event);
        if (!position) return;
        // First childNode is the page canvas
        const canvas = this.inputRef.current?.childNodes[0];
        if (!canvas) return;
        const image = getAreaAsPNG(canvas as HTMLCanvasElement, position.absolute.boundingRect);
        this.props.onAreaSelectionEnd?.({ position, image });
        this.setState({
            areaSelection: { ...areaSelection, position, locked: true },
        });
    };

    onPageLoad = () => {
        const pageNode = this.inputRef.current;
        if (!pageNode) return;
        // Second childNode is the page textLayer div
        const { style } = pageNode.childNodes[1] as HTMLElement;
        style.top = "0";
        style.left = "0";
        style.transform = "";
    };

    onPageRender = () => {
        const pageNode = this.inputRef.current;
        const dimensions = pageNode ? {width: pageNode.clientWidth, height: pageNode.clientHeight} : undefined;
        this.setState({renderComplete: true, pageDimensions: dimensions});
    };

    onMouseDown = (event: React.PointerEvent<HTMLDivElement>) => {
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

    renderSelections = () => {
        if (!this.inputRef || !this.props.selections) return null;
        const selectionRenders = this.props.selections.map((selection, i) => {
            if (!this.state.pageDimensions) return null;
            const normalizedSelection = {...selection, position: selection.position};
            return isAreaSelection(normalizedSelection) ? (
                <AreaSelection key={i} areaSelection={normalizedSelection} dimensions={this.state.pageDimensions} />
            ) : (
                <TextSelection key={i} textSelection={normalizedSelection} dimensions={this.state.pageDimensions} />
            );
        });
        return <>{selectionRenders}</>;
    };

    render = () => {
        return (
            <div
                className="pdfViewer__page-container"
                onPointerDown={this.onMouseDown}
            >
                <Page
                    key={`page_${this.props.pageNumber}`}
                    pageNumber={this.props.pageNumber}
                    width={this.props.width}
                    inputRef={this.inputRef}
                    onLoadSuccess={this.onPageLoad}
                    onRenderSuccess={this.onPageRender}
                >
                    {this.state.renderComplete && this.renderSelections()}
                    {this.props.areaSelectionActive && this.state.areaSelection?.position && (
                        <NewAreaSelection
                            position={this.state.areaSelection.position}
                        />
                    )}
                </Page>
            </div>
        );
    };
}
