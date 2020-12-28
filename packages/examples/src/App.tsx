import React, {useState} from "react";
import {SelectionType, PdfLoader, PdfViewer, SelectionTooltip} from "react-pdf-annotator";

function App() {
    const urls = ["https://arxiv.org/pdf/1708.08021.pdf", "https://arxiv.org/pdf/1604.02480.pdf"];
    const [urlIdx, setUrlIdx] = useState(0);
    const [selection, setSelection] = useState<SelectionType>();
    const toggleUrl = () => setUrlIdx(urlIdx > 0 ? 0 : 1);

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
            <PdfLoader url={urls[urlIdx]} beforeLoad={<h1>Loading...</h1>}>
                {(pdfDocument) => (
                    <PdfViewer
                        pdfDocument={pdfDocument}
                        enableAreaSelection={event => event.altKey}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        <div className="pdfViewer__highlight-tip-container">
                            {selection && <SelectionTooltip selection={selection} />}
                        </div>
                    </PdfViewer>
                )}
            </PdfLoader>
            <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 99,
            }}>
                <button onClick={() => toggleUrl()}>Switch document</button>
            </div>
        </div>
    );
}

export default App;
