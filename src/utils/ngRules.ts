import type { SpecData } from '../types';
import type { SpecJson, NgRule, NgRuleMatch } from '../data/spec/types';

export type NgViolation = {
  parameterKey: string;
  message: string;
  rule: NgRule;
};

function fabricTypeOf(json: SpecJson, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const opt = json.parameters.body_fabric?.options?.find((o) => o.value === value);
  return opt?.type;
}

function ruleMatches(match: NgRuleMatch, data: Partial<SpecData>, json: SpecJson): boolean {
  if (match.body_fabric_type !== undefined) {
    if (fabricTypeOf(json, data.bodyFabric) !== match.body_fabric_type) return false;
  }
  if (match.body_fabric !== undefined && data.bodyFabric !== match.body_fabric) return false;
  if (match.body_color !== undefined && data.bodyColor !== match.body_color) return false;
  if (match.hardware_finish !== undefined && data.hardwareFinish !== match.hardware_finish) return false;
  if (match.piping !== undefined && data.piping !== match.piping) return false;
  if (match.closure !== undefined && data.closure !== match.closure) return false;
  if (match.embroidery !== undefined && data.embroidery !== match.embroidery) return false;
  if (match.lining !== undefined && data.lining !== match.lining) return false;
  if (match.texture !== undefined && data.texture !== match.texture) return false;
  return true;
}

/**
 * Walks every parameter in `json`, gathers all `ng_rules` that have a
 * structured `match`, and returns those that match the given form state.
 * Rules without a `match` (e.g. documented intents whose target value does not
 * yet exist in the master) are skipped.
 */
export function evaluateNgRules(data: Partial<SpecData>, json: SpecJson): NgViolation[] {
  const violations: NgViolation[] = [];
  for (const [parameterKey, param] of Object.entries(json.parameters)) {
    if (!param.ng_rules) continue;
    for (const rule of param.ng_rules) {
      if (!rule.match) continue;
      if (ruleMatches(rule.match, data, json)) {
        violations.push({ parameterKey, message: rule.message, rule });
      }
    }
  }
  return violations;
}

export function hasViolation(
  data: Partial<SpecData>,
  json: SpecJson,
  parameterKey: string,
): boolean {
  return evaluateNgRules(data, json).some((v) => v.parameterKey === parameterKey);
}
