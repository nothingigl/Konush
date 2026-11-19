import tr11Raw from '../../../content/courses/tr/units/tr-1-1.json';
import en11Raw from '../../../content/courses/en/units/en-1-1.json';
import { UnitSchema, type Unit } from './schema';

export const DEMO_TR_UNIT: Unit = UnitSchema.parse(tr11Raw);
export const DEMO_EN_UNIT: Unit = UnitSchema.parse(en11Raw);

export const BUILTIN_DEMO_UNITS: Record<string, Unit> = {
  [DEMO_TR_UNIT.id]: DEMO_TR_UNIT,
  [DEMO_EN_UNIT.id]: DEMO_EN_UNIT,
};
