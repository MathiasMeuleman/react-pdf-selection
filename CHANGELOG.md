# Changelog

### 0.4.1
Update README, add CHANGELOG to repository

### 0.4.0
Virtualize pages with the `react-window` package. This helps tremendously with initial page load
for large PDF files.

### 0.3.1
- Update README

### 0.3.0
Replace PDF.JS viewer with React PDF. This gives more control over how individual pages are
rendered. Selection positions are now rendered using percentages instead of pixel values,
since pixel values could proof inaccurate after normalizing to the (0, 1) domain and
transforming the coordinates back to the current viewport.

### 0.2.0
First working version, including:
- PDF rendering with PDF.JS
- Text and rectangular selections
- Normalized positions provided in selections
