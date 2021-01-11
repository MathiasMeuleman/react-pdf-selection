import React, {Component, createRef} from "react";
import {Page} from "react-pdf";
import {SelectionType} from "../index";
import {AreaSelection} from "./AreaSelection";
import {isAreaSelection} from "./PdfViewer";
import {TextSelection} from "./TextSelection";

interface PdfPageProps {
    pageNumber: number;
    width?: number;
    selections?: SelectionType[];
}

interface PdfPageState {
    pageDimensions?: { width: number; height: number };
    renderComplete: boolean;
}

export class PdfPage extends Component<PdfPageProps, PdfPageState> {

    state: PdfPageState = {
        renderComplete: false,
    };
    inputRef = createRef<HTMLDivElement>();

    onPageLoad = () => {
        const pageNode = this.inputRef.current;
        if (!pageNode) return;
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

    renderSelections = () => {
        if (!this.inputRef || !this.props.selections) return null;
        const selectionRenders = this.props.selections.map((selection, i) => {
            if (!this.state.pageDimensions) return null;
            const normalizedSelection = {...selection, position: selection.position};
            return isAreaSelection(normalizedSelection) ? (
                <AreaSelection key={i} areaSelection={normalizedSelection} />
            ) : (
                <TextSelection key={i} textSelection={normalizedSelection} dimensions={this.state.pageDimensions} />
            );
        });
        return <>{selectionRenders}</>;
    };

    render = () => {
        return (
            <Page
                key={`page_${this.props.pageNumber}`}
                pageNumber={this.props.pageNumber}
                width={this.props.width}
                inputRef={this.inputRef}
                onLoadSuccess={this.onPageLoad}
                onRenderSuccess={this.onPageRender}
            >
                {this.state.renderComplete && this.renderSelections()}
            </Page>
        );
    };
}
