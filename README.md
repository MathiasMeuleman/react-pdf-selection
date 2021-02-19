# React PDF Selection

This library provides text and rectangular area selections for PDF documents. It is built on top of PDF.js by Mozilla.
Selection position data is independent of the current viewport, to make it suitable for resizing documents and permanent
storage. PDF pages are virtualized to prevent too many page renders and make rendering of large documents more smoothly.

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

An online example can be found at https://mathiasmeuleman.github.io/react-pdf-selection

To run the example locally however, from the `packages/examples` folder you can run:

```
npm install
npm start
```

### API Reference

#### `PdfViewer`

General notes:
- All function props that are passed to `PdfViewer` (such as `enableAreaSelection`, `onTextSelection`, etc) should be memoized to avoid performance hits.
- Selections can receive objects as generic types. This allows for additional data to be passed to the Selections by the user.
This data will also be provided when accessing the props in e.g. `textSelectionComponent`, the generics make sure this is properly typed.
If you don't use typings, or don't use additional data for the Selections, don't worry about it, everything will work fine without them.

Property | Type | Required | Notes
:---|:---|:---|:---
url | `string` | yes | The URL from which the PDF file will be retrieved. Note that CORS headers might be needed if the file resides on a remote server.
selections | `SelectionType<D>[]` | no | See the `SelectionType` definitions below. Note that the bounding rectangles should be normalized by the page dimensions (so should be between 0 and 1).
enableAreaSelection | `(event: React.MouseEvent) => boolean` | no | Indicates whether the area selection mode should be enabled. On default the text selection mode is active.
onLoad | `(originalPageDimensions: PageDimensionData) => void` | no | Is called on document load. The original page dimensions are passed with it.
onPageDimensions | `(pageDimensionData: PageDimensionData) => void` | no | Is called whenever the page dimensions are recalculatd.
onTextSelection | `(selection?: NormalizedTextSelection) => void` | no | Is called with the `NormalizedTextSelection` when a new text selection is made, or with `undefined` when the text selection is cancelled/removed.
onAreaSelection | `(selection?: NormalizedAreaSelection) => void` | no | Is called with the `NormalizedAreaSelection` when a new area selection is made, or with `undefined` when the area selection is cancelled/removed.
textSelectionColor | `CSSProperties["color"]` | no | The color for selected text in the rendered PDF document. Defaults to `"blue"`.
areaSelectionComponent | `(props: AreaSelectionProps<D>) => JSX.Element` | no | Override for the default `AreaSelection` component.<sup>1</sup>
textSelectionComponent | `(props: TextSelectionProps<D> => JSX.Element` | no | Override for the default `TextSelection` component.<sup>1</sup>
newAreaSelectionComponent | `(props: NewAreaSelectionProps) => JSX.Element` | no | Override for the default `NewAreaSelection` component.<sup>1</sup>
children | `(props: {document: ReactElement}) => ReactElement | no | Override for the default Document renderer. The `document` prop contains the `ReactElement` in which the entire PDF viewer is rendered. When not provided, the `document` is rendered as is.

<sup>1</sup> See the [custom component specification](#custom-component-specification)

#### `SelectionType`

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
absolute | `{boundingRect: BoundingRect; rects: BoundingRect[]}` | yes | The absolute bounding rectangles of the selection, with coordinates corresponding to the current page dimensions. The `rects` are the individual bounding rectangles for each line of text (if text selection), the `boundingRect` is the larger encompassing bounding rectangle.
normalized | `{boundingRect: BoundingRect; rects: BoundingRect[]}` | yes | The normalized bounding rectangles of the selection, with coordinates normalized to the current page dimensions. The `rects` are the individual bounding rectangles for each line of text (if text selection), the `boundingRect` is the larger encompassing bounding rectangle.
pageNumber | number | yes | 1-based page number on which the selection is made.
pageOffset | number | yes | The total offset in height, caused by all the `pageNumber - 1` pages before this one. 

#### `BoundingRect`

Property | Type | Required
:---|:---|:---
left | number | yes
top | number | yes
right | number | yes
bottom | number | yes

#### `PageDimensionData`

Property | Type | Notes
:---|:---|:---
pageDimensions | `Map<number, { width: number; height: number }>` | A map of page dimensions, where the keys are page numbers (1-based, as in the `Position` objects) and values are `{ width: number; height: number }` objects.
pageYOffsets | `number[]` | An array of page height offsets, indicating at what height the top of the page is. Takes the gap between pages and the border / margin at the top of the document into account.

### Custom component specification

#### Shared typings
##### `BoundingRectWithCSSProperties` properties
- `left`: `CSSProperties["left"]`
- `top`: `CSSProperties["top"]`
- `width`: `CSSProperties["width"]`
- `height`: `CSSProperties["height"]`

##### `PositionWithCSSProperties` properties
- `pageNumber`: `number`
- `boundingRect`: `BoundingRectWithCSSProperties`
- `rects`: `BoundingRectWithCSSProperties[]`
  
#### Shared components
##### AreaSelectionComponent
Can be provided to override the default `AreaSelection` component. Should be a React class component or function component
that receives the following props:
- `areaSelection`: `{image: string; position: PositionWithCSSProperties}`

##### TextSelectionComponent
Can be provided to override the default `TextSelection` component. Should be a React class component or function component
that receives the following props:
- `textSelection`: `{text: string; position: PositionWithCSSProperties}`

##### NewAreaSelectionComponent
Can be provided to override the default `NewAreaSelection` component. Should be a React class component or function component
that receives the following props:
- `boundingRect`: `BoundingRectWithCSSProperties`

New text selections are shown through default text selections. The color of these selections can be customized,
see the `PdfViewer` props definitions for that.

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
