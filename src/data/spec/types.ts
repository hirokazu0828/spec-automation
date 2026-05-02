export interface SpecOption {
  value: string;
  label: string;
  en?: string;
  type?: string;
  price_range?: string;
  aql?: string;
  note?: string;
}

export interface SpecParameter {
  label: string;
  type: string;
  required?: boolean;
  note?: string;
  options?: SpecOption[];
  options_by_fabric_type?: Record<string, SpecOption[]>;
}

export interface AutoFillEntry {
  body_fabric?: string;
  texture?: string;
  lining?: string;
  piping?: string;
  closure?: string;
  embroidery?: string;
  hardware_finish?: string;
  body_color?: string;
}

export interface SpecJson {
  meta: {
    product: string;
    version: string;
    updated: string;
    description: string;
  };
  parameters: Record<string, SpecParameter>;
  auto_fill: Record<string, AutoFillEntry>;
}
