import { StorageUnit, SlotId, RackZone } from "./models";

export function getUnitSlotPrefix(unit: StorageUnit): string {
  if (unit.id === 'rack-a' || unit.name.toLowerCase() === 'rack a') return 'A';
  if (unit.id === 'rack-b' || unit.name.toLowerCase() === 'rack b') return 'B';
  if (unit.is_staging) return 'S';
  return unit.id;
}

export function isSlotInUnit(slotId: SlotId | undefined, unit: StorageUnit): boolean {
  if (!slotId) return false;
  if (unit.is_staging) {
    return slotId.startsWith('S-');
  }
  const prefix = getUnitSlotPrefix(unit);
  return slotId.startsWith(`${prefix}-`);
}

export function parseSlotCoordinates(slotId?: SlotId): { unitPrefix: string; row: number; col: number; isStaging: boolean } | null {
  if (!slotId) return null;
  if (slotId.startsWith('S-')) {
    const num = parseInt(slotId.replace('S-', ''), 10) || 1;
    return { unitPrefix: 'S', row: 1, col: num, isStaging: true };
  }
  const parts = slotId.split('-');
  if (parts.length >= 3) {
    const unitPrefix = parts.slice(0, parts.length - 2).join('-');
    const row = parseInt(parts[parts.length - 2].replace('R', ''), 10) || 1;
    const col = parseInt(parts[parts.length - 1].replace('C', ''), 10) || 1;
    return { unitPrefix, row, col, isStaging: false };
  }
  return null;
}

export function getZoneFromSlotId(slotId?: SlotId, units?: StorageUnit[]): string | null {
  if (!slotId) return null;
  if (slotId.startsWith('S-')) return 'Staging Shelf';
  if (slotId.startsWith('A-')) return 'Rack A';
  if (slotId.startsWith('B-')) return 'Rack B';
  if (units) {
    const match = units.find((u) => isSlotInUnit(slotId, u));
    if (match) return match.name;
  }
  const parsed = parseSlotCoordinates(slotId);
  return parsed ? parsed.unitPrefix : null;
}

export function formatSlotLabel(slotId?: SlotId, units?: StorageUnit[]): string {
  if (!slotId) return 'Unassigned';
  if (slotId.startsWith('S-')) {
    const num = parseInt(slotId.replace('S-', ''), 10);
    return `Staging Bin · #${num}`;
  }
  const parsed = parseSlotCoordinates(slotId);
  if (parsed) {
    let unitName = parsed.unitPrefix;
    if (parsed.unitPrefix === 'A') unitName = 'Rack A';
    else if (parsed.unitPrefix === 'B') unitName = 'Rack B';
    else if (units) {
      const match = units.find((u) => u.id === parsed.unitPrefix || getUnitSlotPrefix(u) === parsed.unitPrefix);
      if (match) unitName = match.name;
    }
    return `${unitName} · Row ${parsed.row}, Col ${parsed.col}`;
  }
  return slotId;
}

export function generateUnitSlots(unit: StorageUnit): SlotId[] {
  if (unit.is_staging) {
    return generateAllStagingSlots();
  }
  const prefix = getUnitSlotPrefix(unit);
  const slots: SlotId[] = [];
  for (let r = 1; r <= unit.rows; r++) {
    for (let c = 1; c <= unit.columns; c++) {
      const rowStr = r < 10 ? `0${r}` : `${r}`;
      const colStr = c < 10 ? `0${c}` : `${c}`;
      slots.push(`${prefix}-R${rowStr}-C${colStr}`);
    }
  }
  return slots;
}

export function generateAllRackSlots(prefix: string): SlotId[] {
  const slots: SlotId[] = [];
  for (let r = 1; r <= 12; r++) {
    for (let c = 1; c <= 4; c++) {
      const rowStr = r < 10 ? `0${r}` : `${r}`;
      const colStr = c < 10 ? `0${c}` : `${c}`;
      slots.push(`${prefix}-R${rowStr}-C${colStr}`);
    }
  }
  return slots;
}

export function generateAllStagingSlots(): SlotId[] {
  const slots: SlotId[] = [];
  for (let s = 1; s <= 12; s++) {
    const slotStr = s < 10 ? `0${s}` : `${s}`;
    slots.push(`S-${slotStr}`);
  }
  return slots;
}

