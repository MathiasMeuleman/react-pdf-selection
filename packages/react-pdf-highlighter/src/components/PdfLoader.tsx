import {getDocument, GlobalWorkerOptions, PDFDocumentProxy} from "pdfjs-dist";
import React, {Component, ReactElement} from "react";

// Set the PDF worker
GlobalWorkerOptions.workerSrc = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";

type PdfLoaderProps = {
    url: string,
    beforeLoad: ReactElement,
    errorMessage?: ReactElement,
    children: (pdfDocument: PDFDocumentProxy) => ReactElement,
    onError?: (error: Error) => void,
};

type PdfLoaderState = {
    pdfDocument?: PDFDocumentProxy,
    error?: Error,
};

export class PdfLoader extends Component<PdfLoaderProps, PdfLoaderState> {

    constructor(props: PdfLoaderProps) {
        super(props);
        this.state = {};
    }

    discardDocument(document?: PDFDocumentProxy) {
        document && document.destroy();
    }

    componentDidMount() {
        this.load();
    }

    componentWillUnmount() {
        this.discardDocument(this.state.pdfDocument);
    }

    componentDidUpdate({ url }: PdfLoaderProps) {
        if (this.props.url !== url) {
            this.load();
        }
    }

    componentDidCatch(error: Error, info?: any) {
        const { onError } = this.props;

        if (onError) {
            onError(error);
        }

        this.setState({ pdfDocument: undefined, error });
    }

    load() {
        const { url } = this.props;
        const { pdfDocument } = this.state;
        this.setState({ pdfDocument: undefined, error: undefined });
        try {
            this.discardDocument(pdfDocument);
            if (!url) return;
            getDocument(url).promise.then(pdfDocument => {
                this.setState({pdfDocument});
            });
        } catch (e) {
            this.componentDidCatch(e);
        }
    }

    render() {
        const { children, beforeLoad } = this.props;
        const { pdfDocument, error } = this.state;

        return error
            ? this.renderError()
            : !pdfDocument || !children
                ? beforeLoad
                : children(pdfDocument);
    }

    renderError() {
        const { errorMessage } = this.props;
        if (errorMessage) {
            return React.cloneElement(errorMessage, { error: this.state.error });
        }

        return null;
    }
}
