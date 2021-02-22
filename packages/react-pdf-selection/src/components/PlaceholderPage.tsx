import React, { Component } from "react";
import { PageLoader } from "./PageLoader";
import "../style/spinner.css";
import {getPageHeight, getPageWidth} from "./PdfPage";
import {PageDimension} from "./PdfViewer";

interface PlaceHolderPageProps {
    pageDimensions?: PageDimension;
}

export class PlaceholderPage extends Component<PlaceHolderPageProps> {
    render = () => {
        return (
            <div
                className="pdfViewer__page-container"
                style={{
                    ...(this.props.pageDimensions ? {
                        width: `${getPageWidth(this.props.pageDimensions)}px`,
                        height: `${getPageHeight(this.props.pageDimensions)}px`,
                    } : {}),
                }}
            >
                <PageLoader />
            </div>
        );
    };
}
