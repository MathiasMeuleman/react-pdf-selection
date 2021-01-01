import React, { useState } from "react";
import { SelectionType, PdfLoader, PdfViewer, SelectionTooltip } from "react-pdf-selection";
import { pdfs } from "./example-pdfs";

const App = () => {
    const [pdfIdx, setPdfIdx] = useState(0);
    const [selection, setSelection] = useState<SelectionType>();
    const toggleUrl = () => setPdfIdx(pdfIdx > 0 ? 0 : 1);

    const setAndLogSelection = (highlightTip?: SelectionType) => {
        console.log(highlightTip);
        setSelection(highlightTip);
    };

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                textAlign: "center",
            }}
        >
            <PdfLoader url={pdfs[pdfIdx].url} beforeLoad={<h1>Loading...</h1>}>
                {(pdfDocument) => (
                    <PdfViewer
                        pdfDocument={pdfDocument}
                        selections={pdfs[pdfIdx].selections}
                        enableAreaSelection={(event) => event.altKey}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        <div className="pdfViewer__highlight-tip-container">
                            {selection && <SelectionTooltip selection={selection} />}
                        </div>
                    </PdfViewer>
                )}
            </PdfLoader>
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    zIndex: 99,
                }}
            >
                <button onClick={() => toggleUrl()}>Switch document</button>
            </div>
        </div>
    );
};

export default App;
