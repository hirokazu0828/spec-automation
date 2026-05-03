export interface SpecOption {
  value: string;
  label: string;
  en?: string;
  type?: string;
  price_range?: string;
  aql?: string;
  note?: string;
  feature?: string;
}

export interface NgRuleMatch {
  body_fabric?: string;
  body_fabric_type?: string;
  body_color?: string;
  hardware_finish?: string;
  piping?: string;
  closure?: string;
  embroidery?: string;
  lining?: string;
  texture?: string;
}

export interface NgRule {
  condition: string;
  message: string;
  severity: '高' | '中' | '低';
  match?: NgRuleMatch;
  note?: string;
}

export interface SpecParameter {
  label: string;
  type: string;
  required?: boolean;
  note?: string;
  options?: SpecOption[];
  options_by_fabric_type?: Record<string, SpecOption[]>;
  ng_rules?: NgRule[];
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

export interface DimensionSpec {
  standard: number;
  range?: number[];
  unit?: 'mm' | string;
}

export interface CombinationsCount {
  theoretical: number;
  realistic: string;
  calculation: string;
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
  dimensions?: Record<string, Record<string, DimensionSpec>>;
  combinations_count?: CombinationsCount;
  sample_combinations?: unknown[];
}
