import React, {Component} from "react";

interface PlaceHolderPageProps {
    pageDimensions?: {width: number; height: number};
}

export class PlaceholderPage extends Component<PlaceHolderPageProps> {
    render = () => {
        return (
            <div
                className="pdfViewer__page-container"
                style={{
                    width: `${this.props.pageDimensions?.width}px`,
                    height: `${this.props.pageDimensions?.height}px`,
                }}
            />
        )
    }
}