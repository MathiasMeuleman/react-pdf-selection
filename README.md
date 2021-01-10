# React PDF Selection

This library provides text and rectangular area selections for PDF documents. It is built on top of PDF.js by Mozilla.
Selection position data is independent of the current viewport, to make it suitable for resizing documents and permanent
storage.

Installation is simply done with `npm` or `yarn`:

```
npm install react-pdf-selection
// or 
yarn install react-pdf-selection
```

After this, the `PdfViewer` component can be used to create a PDF viewer on which selections can be made.
There are options to provide selections to the viewer, components to overwrite how these selections are rendered
and options to listen for new selections made by users. Default components, as well as a PdfLoader are provided in this
 package as well and can optionally be used. See the example and API reference for all the details.

### Examples

An online example can be found at https://MathiasMeuleman.github.io/react-pdf-selection

To run the example locally however, from the `packages/examples` folder you can run:

```
npm install
npm start
```

### API Reference

#### `PdfLoader` props

Property | Type | Required | Notes
:---|:---|:---|:---
url | `string` | yes | If using an external source, make sure the CORS headers are set properly (see [this link](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS))
beforeLoad | `ReactElement` | yes |
errorMessage | `ReactElement` | no |
children | `(pdfDocument: PDFDocumentProxy) => void` | yes | The `PDFDocumentProxy` type comes from the `pdfjs-dist` package
onError | `(error: Error) => void` | no |

#### `PdfViewer` props

Property | Type | Required | Notes
:---|:---|:---|:---
pdfDocument | `PDFDocumentProxy` | yes | The `PDFDocumentProxy` type comes from the `pdfjs-dist` package.
selections | `SelectionType[]` | no | See the `SelectionType` definitions below. Note that the bounding rectangles should be normalized by the page dimensions (so should be between 0 and 1).
enableAreaSelection | `(event: React.MouseEvent) => boolean` | no | Indicates whether the area selection mode should be enabled. On default the text selection mode is active.
onTextSelection | `(selection?: NormalizedTextSelection) => void` | no | Is called with the `NormalizedTextSelection` when a new text selection is made, or with `undefined` when the text selection is cancelled/removed.
onAreaSelection | `(selection?: NormalizedAreaSelection) => void` | no | Is called with the `NormalizedAreaSelection` when a new area selection is made, or with `undefined` when the area selection is cancelled/removed.

#### `SelectionType`

Property | Type | Required | Notes
:---|:---|:---|:---
position | `Position` | yes | The position of the selection on the document.
text | `string` | no | The text contained in the selection. This property is required when the selection is a `TextSelectionType`, and is ignored when the selection is an `AreaSelectionType`.
image | `string` | no | The Base64 encoded PNG image of an area selection. This property is required when the selection is an `AreaSelectionType`, and is ignored when the selection is a `TextSelectionType`.

#### `NormalizedSelection`

Property | Type | Required | Notes
:---|:---|:---|:---
position | `NormalizedPosition` | yes | The normalized position of the selection on the document.
text | `string` | no | The text contained in the selection. This property is required when the selection is a `TextSelectionType`, and is ignored when the selection is an `AreaSelectionType`.
image | `string` | no | The Base64 encoded PNG image of an area selection. This property is required when the selection is an `AreaSelectionType`, and is ignored when the selection is a `TextSelectionType`.

#### `Position`

Property | Type | Required | Notes
:---|:---|:---|:---
boundingRect | `BoundingRect` | yes | The bounding rectangle of the entire selection.
rects | `BoundingRect[]` | yes | The bounding rectangle of each of the selections rectangles. In case of an area selection, this is equal to `boundingRect`, in case of a text selection there is one `BoundingRect` for each line of selected text.
pageNumber | number | yes | 1-based page number on which the selection is made.
pageOffset | number | yes | The total offset in height, caused by all the `pageNumber - 1` pages before this one. 

#### `NormalizedPosition`

Property | Type | Required | Notes
:---|:---|:---|:---
absolute | `{boundingRect: BoundingRect; rects: BoundingRect[]}` | yes | The absolute bounding rectangle of the entire selection, with coordinates corresponding to the current page dimensions.
relative | `{boundingRect: BoundingRect; rects: BoundingRect[]}` | yes | The relative bounding rectangle of the selection, with coordinates relative to the current page.
normalized | `{boundingRect: BoundingRect; rects: BoundingRect[]}` | yes | The normalized bounding rectangle of the entire selection, with coordinates normalized to the current page dimensions.
pageNumber | number | yes | 1-based page number on which the selection is made.
pageOffset | number | yes | The total offset in height, caused by all the `pageNumber - 1` pages before this one. 

#### `BoundingRect`

Property | Type | Required
:---|:---|:---
left | number | yes
top | number | yes
width | number | yes
height | number | yes

### Prior art

 - [`react-pdf`](https://github.com/wojtekmaj/react-pdf) and [`react-pdfjs`](https://github.com/erikras/react-pdfjs) provide React
wrappers for PDF.js.
 - [`pdfjs-annotate`](https://github.com/instructure/pdf-annotate.js/) does not
provide text highlights out of the box.
 - [`react-pdf-highlighter`](https://github.com/agentcooper/react-pdf-highlighter) provides highlights, but however misses
type definitions and does not provide the freedom for many applications.

### Contributing

The library can be compiled by running `npm run build` (alternatively use `npm run dev` to enable TypeScript `--watch` option).
Use `npm link` to link the `dist` folder to your `node_modules`, so changes are automatically updated.

Feel free to submit a pull request!
