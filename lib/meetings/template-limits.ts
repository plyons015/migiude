import type { PlanId } from "@/lib/plan/config-schema";

/** Custom templates allowed in addition to the 3 built-ins. */
export function customTemplateLimitForPlan(plan: PlanId): number {
  switch (plan) {
    case "free":
      return 0;
    case "pro":
      return 10;
    case "power":
      return 25;
    default:
      return 0;
  }
}

export function canCreateCustomTemplates(plan: PlanId): boolean {
  return customTemplateLimitForPlan(plan) > 0;
}
