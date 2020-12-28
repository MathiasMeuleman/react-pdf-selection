import {PDFDocumentProxy} from "pdfjs-dist";
// @ts-ignore-next-line
import {EventBus, PDFLinkService, PDFViewer} from "pdfjs-dist/web/pdf_viewer";
import React, {Component, ReactNode} from "react";
import {EventBus as EventBusType, LinkService as LinkServiceType, Viewer as ViewerType} from "../types";

interface PdfViewerProps {
    pdfDocument: PDFDocumentProxy,
}

interface PdfViewerState {
    containerNode?: ReactNode;
    viewer?: ViewerType;
}

export class PdfViewer extends Component<PdfViewerProps, PdfViewerState> {

    state: PdfViewerState = {};
    eventBus: EventBusType = new EventBus();
    linkService: LinkServiceType = new PDFLinkService({ eventBus: this.eventBus });

    pdfContainerRefCallback = (ref: ReactNode) => {
        if (ref) {
            this.setState({containerNode: ref}, () => this.init());
        }
    };

    componentDidUpdate(prevProps: PdfViewerProps) {
        if (prevProps.pdfDocument !== this.props.pdfDocument) {
            this.init();
            return;
        }
    }

    init = () => {
        const viewer = this.state.viewer ||
            new PDFViewer({
                container: this.state.containerNode,
                eventBus: this.eventBus,
                enhanceTextSelection: true,
                removePageBorders: true,
                linkService: this.linkService,
            }) as ViewerType;

        this.linkService.setDocument(this.props.pdfDocument);
        this.linkService.setViewer(viewer);
        viewer.setDocument(this.props.pdfDocument);

        this.setState({viewer});
        // debug
        (window as any).PdfViewer = this;
    };

    render = () => {
        return (
            <div
                ref={this.pdfContainerRefCallback}
                className="pdfViewerContainer"
                style={{
                    height: "100%",
                    overflow: "auto",
                    position: "absolute",
                    width: "100%",
                }}
            >
                <div className="pdfViewer" />
            </div>
        );
    }
}
