import { unitOf, type FrameSize } from "./shared";
import { textWidth } from "./Text";

// Where a table's parts go, in pixels. A table is drawn from existing
// pieces (layout/plan.ts): a box and lines for the grid, a fill behind the
// header, and one text per cell.

export type TableShape = {
  x: number; // centre of the title and grid together, percent of the frame
  y: number;
  w: number; // width, in size units (wider if the text needs it)
  rows: string[][];
  size: number; // font size, in size units
  title?: string;
  columns?: number[];
};

export type TableLayout = {
  left: number;
  top: number; // the grid's top (below the title)
  width: number;
  height: number;
  rowHeight: number;
  columnLefts: number[];
  columnWidths: number[];
  fontSize: number;
  title: { y: number; fontSize: number } | null;
};

const ROW_HEIGHT = 1.9; // in font sizes
const TITLE_SIZE = 1.2; // the title's font size, in cell font sizes
export const CELL_PADDING = 0.45; // left of each cell's text, in font sizes

export const columnCount = (rows: string[][]) =>
  Math.max(1, ...rows.map((row) => row.length));

export const tableLayout = (
  table: TableShape,
  frame: FrameSize,
): TableLayout => {
  const unit = unitOf(frame);
  const fontSize = table.size * unit;
  const columns = columnCount(table.rows);
  // Every column is at least as wide as its longest text (the estimate is
  // a little generous); the table is "w" wide unless that is too narrow,
  // and any room left over is shared by "columns" or by those widths.
  const padding = 2 * CELL_PADDING * fontSize;
  const needed = Array.from(
    { length: columns },
    (_, c) =>
      Math.max(
        ...table.rows.map((row) => textWidth(row[c] ?? "", fontSize) * 1.15),
        fontSize,
      ) + padding,
  );
  const neededTotal = needed.reduce((sum, w) => sum + w, 0);
  const width = Math.max(table.w * unit, neededTotal);
  const weights =
    table.columns && table.columns.length === columns ? table.columns : needed;
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  const spare = width - neededTotal;
  const columnWidths = needed.map(
    (w, c) => w + (spare * weights[c]) / weightTotal,
  );
  const rowHeight = fontSize * ROW_HEIGHT;
  const height = rowHeight * table.rows.length;
  const titleHeight = table.title ? fontSize * TITLE_SIZE * 1.8 : 0;
  const left = (table.x / 100) * frame.width - width / 2;
  const top =
    (table.y / 100) * frame.height - (height + titleHeight) / 2 + titleHeight;
  const columnLefts = columnWidths.map((_, c) =>
    columnWidths.slice(0, c).reduce((sum, w) => sum + w, left),
  );
  return {
    left,
    top,
    width,
    height,
    rowHeight,
    columnLefts,
    columnWidths,
    fontSize,
    title: table.title
      ? { y: top - titleHeight / 2, fontSize: fontSize * TITLE_SIZE }
      : null,
  };
};

// A row ("<id>.<row>") or cell ("<id>.<row>.<column>") of a table, as a
// rectangle in pixels; null if there is no such row or cell.
export const tablePart = (
  layout: TableLayout,
  rows: string[][],
  part: number[],
) => {
  const [row, column] = part;
  if (!Number.isInteger(row) || row < 0 || row >= rows.length) return null;
  const top = layout.top + row * layout.rowHeight;
  if (column === undefined) {
    return {
      left: layout.left,
      top,
      width: layout.width,
      height: layout.rowHeight,
    };
  }
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    column >= layout.columnWidths.length
  ) {
    return null;
  }
  return {
    left: layout.columnLefts[column],
    top,
    width: layout.columnWidths[column],
    height: layout.rowHeight,
  };
};
