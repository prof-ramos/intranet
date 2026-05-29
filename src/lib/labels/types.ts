export interface LabelPreset {
  id: string;
  name: string;
  page: {
    width: number; // pt
    height: number; // pt
  };
  margins: {
    top: number; // pt
    left: number; // pt
  };
  label: {
    width: number; // pt
    height: number; // pt
  };
  gap: {
    horizontal: number; // pt
    vertical: number; // pt
  };
  grid: {
    columns: number;
    rows: number;
  };
  padding: {
    top: number; // pt
    right: number; // pt
    bottom: number; // pt
    left: number; // pt
  };
  text: {
    fontName: 'Helvetica' | 'TimesRoman' | 'Courier';
    fontSize: number;
    lineHeight: number;
    maxLines: number;
  };
}

export interface LabelItem {
  id: string;
  name?: string;
  line1?: string;
  line2?: string;
  line3?: string;
}

export interface GenerateLabelsPdfOptions {
  preset: LabelPreset;
  items: LabelItem[];
  startPosition?: number; // 0-indexed position to start on the first page
  drawDebugGrid?: boolean; // Draw red borders around labels for alignment check
}
