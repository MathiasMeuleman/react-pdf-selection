import React, {ComponentType, CSSProperties, PureComponent} from "react";
import {NormalizedAreaSelection, SelectionType} from "../index";
import {AreaSelectionProps} from "./AreaSelection";
import {NewAreaSelectionProps} from "./NewAreaSelection";
import {PdfPage} from "./PdfPage";
import {TextSelectionProps} from "./TextSelection";

export interface PdfPageData {
    pageRefs: Map<number, HTMLDivElement | null>;
    areaSelectionActivePage: number;
    pageDimensions?: Map<number, { width: number; height: number }>;
    selectionMap?: Map<number, SelectionType[]>;
    enableAreaSelection?: (event: React.MouseEvent) => boolean;
    onAreaSelectionStart?: (pageNumber: number) => void;
    onAreaSelectionEnd?: (selection: NormalizedAreaSelection) => void;
    textSelectionComponent?: ComponentType<TextSelectionProps>;
    areaSelectionComponent?: ComponentType<AreaSelectionProps>;
    newAreaSelectionComponent?: ComponentType<NewAreaSelectionProps>;
}

interface VirtualizedPdfPageWrapperProps {
    index: number;
    style: CSSProperties;
    data: PdfPageData;
}

export class VirtualizedPdfPageWrapper extends PureComponent<VirtualizedPdfPageWrapperProps> {
    
    getPageData = () => {
        const pageNumber = this.props.index + 1;
        return {
            ...this.props.data,
            pageNumber,
            style: this.props.style,
            areaSelectionActive: this.props.data.areaSelectionActivePage === pageNumber,
            pageDimensions: this.props.data.pageDimensions?.get(pageNumber),
            selections: this.props.data.selectionMap?.get(pageNumber),
        };
    };
    
    render = () => (
        <PdfPage {...this.getPageData()} />
    );
}
