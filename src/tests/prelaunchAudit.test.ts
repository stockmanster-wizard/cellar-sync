/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pre-Launch Automated Self-Test & Multi-User Audit Suite
 * Executes end-to-end verification of:
 * 1. Multi-Tenant Isolation & Owner Legacy Claim
 * 2. Rack Coordinate Math & Resize/Delete Collision Guards
 * 3. Sommelier Old World Varietal & Wine Folly 9 Styles Normalization
 * 4. Firestore Security Rules Schema & Red-Team Shadow Update Audit
 * 5. OAuth Popup Environment Guard & Backup JSON Round-Trip
 */

import fs from 'fs';
import path from 'path';

// Setup lightweight in-memory localStorage & window polyfill BEFORE importing browser services
const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
  setItem: (key: string, val: string) => {
    memoryStore.set(key, String(val));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
};

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    self: {},
    top: {},
    location: { hostname: 'ais-pre-d2rgvgetp5wgy7ipgkzwu3-459323274299.us-east1.run.app' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  (globalThis as any).CustomEvent = class CustomEvent {
    detail: any;
    constructor(_type: string, opts?: { detail?: any }) {
      this.detail = opts?.detail;
    }
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`  PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  FAIL: ${testName}${details ? ` — ${details}` : ''}`);
  }
}

async function runPreLaunchAudit() {
  console.log('==============================================================');
  console.log(' CELLARSYNC AI — PRE-LAUNCH MULTI-USER & SECURITY AUDIT SUITE');
  console.log('==============================================================\n');

  const {
    normalizeVarietal,
    normalizeWineStyle,
    parseSlotCoordinates,
    isSlotInUnit,
    generateUnitSlots,
    WINE_STYLES,
  } = await import('../types/cellar');
  const { formatAuthErrorMessage, isSandboxedDevPreview } = await import('../services/authService');
  const { CellarStore } = await import('../services/cellarStore');

  // ---------------------------------------------------------------------------
  // SUITE 1: Multi-User Isolation & Legacy Claim Verification
  // ---------------------------------------------------------------------------
  console.log('1. Multi-Tenant Isolation & Owner Legacy Claim');
  memoryStore.clear();
  CellarStore.resetMemoryCache();

  // Seed 2 unassigned legacy bottles before anyone logs in
  const legacyBottles = [
    {
      id: 'legacy-bottle-1',
      producer: 'Castello di Ama',
      wineName: 'San Lorenzo Gran Selezione',
      varietal: 'Sangiovese',
      vintage: 2018,
      style: 'Medium-Bodied Red Wine',
      country: 'Italy',
      region: 'Tuscany / Chianti Classico',
      alcoholPercent: 13.5,
      drinkingWindow: '2024 - 2035',
      slotId: 'A-R01-C01',
      status: 'in-cellar',
      addedAt: new Date().toISOString(),
    },
    {
      id: 'legacy-bottle-2',
      producer: 'Domaine Drouhin',
      varietal: 'Pinot Noir',
      vintage: 2021,
      style: 'Light-Bodied Red Wine',
      country: 'United States',
      region: 'Willamette Valley',
      slotId: 'B-R02-C03',
      status: 'in-cellar',
      addedAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem('cellarsync_inventory_v1', JSON.stringify(legacyBottles));
  CellarStore.resetMemoryCache();

  // Step 1A: Friend A (Google user) signs in FIRST — must NOT claim unassigned legacy bottles
  const friendA = {
    uid: 'google_friend_alex_991',
    email: 'alex.tester@gmail.com',
    displayName: 'Alex Tester',
    provider: 'google' as const,
  };
  CellarStore.setCurrentUser(friendA);

  assert(
    CellarStore.getBottles().length === 0,
    'Friend A starts with 0 bottles and does NOT claim unassigned legacy cellar records'
  );
  assert(
    CellarStore.getStorageUnits().length === 3,
    'Friend A is provisioned 3 isolated default storage units (Rack A, Rack B, Staging Shelf)'
  );

  // Friend A adds 2 bottles and a custom rack
  const friendABottle = CellarStore.addBottle({
    producer: 'Ridge Vineyards',
    wineName: 'Monte Bello',
    varietal: 'Cabernet Sauvignon',
    vintage: 2019,
    style: 'Full-Bodied Red Wine',
    country: 'United States',
    region: 'Santa Cruz Mountains',
    alcoholPercent: 13.8,
    drinkingWindow: '2026 - 2040',
    slotId: 'A-R01-C01',
  });
  const friendACustomRack = CellarStore.addStorageUnit({
    name: 'EuroCave Fridge',
    columns: 6,
    rows: 10,
  });

  assert(
    CellarStore.getBottles().length === 1 && friendABottle.user_id === friendA.uid,
    'Friend A bottle is tagged with Friend A UID'
  );
  assert(
    CellarStore.getStorageUnits().length === 4,
    'Friend A sees their custom EuroCave Fridge rack (4 total units)'
  );

  // Step 1B: Friend B (Email/Password user) signs in — must see 0 of Friend A's or legacy data
  const friendB = {
    uid: '001842.9a8b7c6d5e4f.1024',
    email: 'claire.friend@example.com',
    displayName: 'Claire Friend',
    provider: 'password' as const,
  };
  CellarStore.setCurrentUser(friendB);

  assert(
    CellarStore.getBottles().length === 0,
    'Friend B (Email UID) sees 0 bottles from Friend A or legacy cellar'
  );
  assert(
    CellarStore.getStorageUnits().length === 3 &&
      !CellarStore.getStorageUnits().some((u) => u.name === 'EuroCave Fridge'),
    'Friend B does not see Friend A custom EuroCave Fridge rack'
  );

  // Step 1C: Owner (stockmanster@gmail.com) signs in — claims the 2 unassigned legacy bottles automatically
  const ownerUser = {
    uid: 'google_owner_stockmanster_real_uid',
    email: 'stockmanster@gmail.com',
    displayName: 'Mark Stockman',
    provider: 'google' as const,
  };
  CellarStore.setCurrentUser(ownerUser);

  const ownerBottles = CellarStore.getBottles();
  assert(
    ownerBottles.length === 2 &&
      ownerBottles.every((b) => b.user_id === ownerUser.uid) &&
      !ownerBottles.some((b) => b.producer === 'Ridge Vineyards'),
    'Owner (stockmanster@gmail.com) claims unassigned legacy bottles and sees 0 of Friend A bottles'
  );

  // ---------------------------------------------------------------------------
  // SUITE 2: Rack Geometry, Coordinate Math & Resize/Delete Collision Guards
  // ---------------------------------------------------------------------------
  console.log('\n2. Rack Geometry, Coordinate Math & Collision Guards');
  CellarStore.setCurrentUser(friendA);

  // Place a bottle in Friend A's custom rack at Row 8, Col 5
  const deepSlotId = `${friendACustomRack.id}-R08-C05`;
  const deepBottle = CellarStore.addBottle({
    producer: 'Giacomo Conterno',
    wineName: 'Barolo Francia',
    varietal: 'Nebbiolo',
    vintage: 2017,
    style: 'Full-Bodied Red Wine',
    country: 'Italy',
    region: 'Piedmont / Barolo',
    slotId: deepSlotId,
  });

  const parsedCoords = parseSlotCoordinates(deepSlotId);
  assert(
    parsedCoords !== null && parsedCoords.row === 8 && parsedCoords.col === 5 && !parsedCoords.isStaging,
    'parseSlotCoordinates accurately extracts Row 8, Col 5 from custom unit slot ID'
  );
  assert(
    isSlotInUnit(deepSlotId, friendACustomRack),
    'isSlotInUnit matches custom rack slot ID to custom rack unit'
  );
  assert(
    generateUnitSlots(friendACustomRack).length === 60,
    'generateUnitSlots creates 60 slots for 6x10 custom rack'
  );

  // Attempt to shrink rows to 6 (below occupied Row 8)
  const shrinkRowCheck = CellarStore.canResizeUnit(friendACustomRack.id, 6, 6);
  assert(
    !shrinkRowCheck.canResize && shrinkRowCheck.outOfBoundsCount === 1,
    'canResizeUnit blocks shrinking rows to 6 when a bottle occupies Row 8'
  );

  // Attempt to shrink columns to 4 (below occupied Col 5)
  const shrinkColCheck = CellarStore.canResizeUnit(friendACustomRack.id, 4, 10);
  assert(
    !shrinkColCheck.canResize && shrinkColCheck.outOfBoundsCount === 1,
    'canResizeUnit blocks shrinking columns to 4 when a bottle occupies Col 5'
  );

  // Resize to 6x8 (includes Row 8, Col 5) should succeed
  const validResize = CellarStore.updateStorageUnit(friendACustomRack.id, { columns: 6, rows: 8 });
  assert(
    validResize.success && validResize.unit?.rows === 8,
    'updateStorageUnit allows resizing to 6x8 when occupied slot is within bounds'
  );

  // Resize to 12 columns should succeed
  const expandTo12Cols = CellarStore.updateStorageUnit(friendACustomRack.id, { columns: 12, rows: 8 });
  assert(
    expandTo12Cols.success && expandTo12Cols.unit?.columns === 12,
    'updateStorageUnit allows expanding to 12 columns'
  );

  // Attempt to delete occupied custom rack
  const deleteOccupied = CellarStore.deleteStorageUnit(friendACustomRack.id);
  assert(
    !deleteOccupied.success,
    'deleteStorageUnit blocks deleting a rack that currently holds active bottles'
  );

  // Attempt to delete permanent Staging Shelf
  const stagingUnit = CellarStore.getStorageUnits().find((u) => u.is_staging)!;
  const deleteStaging = CellarStore.deleteStorageUnit(stagingUnit.id);
  assert(
    !deleteStaging.success,
    'deleteStorageUnit blocks deleting the permanent Staging Shelf'
  );

  // Consume deepBottle so custom rack becomes empty, then delete custom rack
  const consumed = CellarStore.consumeBottle(deepBottle.id, 'Exceptional structure and rose petal aromatics', 5);
  assert(
    consumed !== null && consumed.status === 'consumed' && consumed.slotId === undefined && consumed.rating === 5,
    'consumeBottle clears slotId, sets status to consumed, and records 5-star rating'
  );

  const deleteEmpty = CellarStore.deleteStorageUnit(friendACustomRack.id);
  assert(
    deleteEmpty.success,
    'deleteStorageUnit allows deleting custom rack once all bottles are moved or consumed'
  );

  // Multi-Bottle Intake & Slot Allocation Batch Verification
  const batchWines = [
    {
      producer: 'Marchesi Antinori',
      wineName: 'Tignanello',
      varietal: 'Sangiovese',
      vintage: 2021 as const,
      style: 'Full-Bodied Red Wine' as const,
      country: 'Italy',
      region: 'Tuscany',
      slotId: 'A-R01-C01',
    },
    {
      producer: 'Marchesi Antinori',
      wineName: 'Tignanello',
      varietal: 'Sangiovese',
      vintage: 2021 as const,
      style: 'Full-Bodied Red Wine' as const,
      country: 'Italy',
      region: 'Tuscany',
      slotId: 'A-R01-C02',
    },
    {
      producer: 'Marchesi Antinori',
      wineName: 'Tignanello',
      varietal: 'Sangiovese',
      vintage: 2021 as const,
      style: 'Full-Bodied Red Wine' as const,
      country: 'Italy',
      region: 'Tuscany',
      slotId: undefined, // Sent to Staging Shelf
    },
  ];

  const createdBatch = CellarStore.addBottlesBatch(batchWines);
  assert(
    createdBatch.length === 3 &&
    createdBatch[0].id !== createdBatch[1].id &&
    createdBatch[0].producer === 'Marchesi Antinori' &&
    createdBatch[0].slotId === 'A-R01-C01' &&
    createdBatch[0].status === 'in-cellar' &&
    createdBatch[1].slotId === 'A-R01-C02' &&
    createdBatch[1].status === 'in-cellar' &&
    createdBatch[2].slotId === undefined &&
    createdBatch[2].status === 'staging',
    'addBottlesBatch allocates bottles across cellar slots and staging with distinct IDs and identical metadata'
  );

  // ---------------------------------------------------------------------------
  // SUITE 3: Sommelier Varietal & Wine Folly 9 Styles Normalization
  // ---------------------------------------------------------------------------
  console.log('\n3. Sommelier Varietal & Wine Folly 9 Styles Normalization');

  const chianti = normalizeVarietal('Blend', {
    region: 'Tuscany / Chianti Classico DOCG',
    country: 'Italy',
    wineName: 'San Lorenzo Gran Selezione',
  });
  assert(chianti === 'Sangiovese', `Chianti Classico normalizes 'Blend' -> '${chianti}'`);

  const barolo = normalizeVarietal(undefined, {
    region: 'Barolo DOCG, Piedmont',
    country: 'Italy',
  });
  assert(barolo === 'Nebbiolo', `Barolo normalizes empty varietal -> '${barolo}'`);

  const chablis = normalizeVarietal('White Blend', {
    region: 'Chablis Premier Cru',
    country: 'France',
  });
  assert(chablis === 'Chardonnay', `Chablis normalizes -> '${chablis}'`);

  const burgundy = normalizeVarietal('Blend', {
    region: 'Côte de Nuits, Burgundy',
    country: 'France',
  });
  assert(burgundy === 'Pinot Noir', `Red Burgundy normalizes -> '${burgundy}'`);

  const cdp = normalizeVarietal('Blend', {
    region: 'Châteauneuf-du-Pape, Southern Rhône',
    country: 'France',
  });
  assert(cdp === 'GSM Blend', `Châteauneuf-du-Pape normalizes -> '${cdp}'`);

  const bordeaux = normalizeVarietal('Blend', {
    region: 'Pauillac, Bordeaux',
    country: 'France',
  });
  assert(bordeaux === 'Bordeaux Blend', `Pauillac Bordeaux normalizes -> '${bordeaux}'`);

  const genericRed = normalizeVarietal('Blend', {
    region: 'Napa Valley',
    country: 'USA',
    style: 'Full-Bodied Red Wine',
  });
  assert(genericRed !== 'Blend' && genericRed === 'Red Blend', `Generic 'Blend' never outputs standalone 'Blend' (-> '${genericRed}')`);

  const allStylesValid = [
    'Red',
    'White',
    'Sparkling',
    'Rosé',
    'Dessert / Fortified',
    'Pinot Noir',
    'Riesling',
  ].every((raw) => Object.keys(WINE_STYLES).includes(normalizeWineStyle(raw)));
  assert(allStylesValid, 'normalizeWineStyle maps all legacy/shorthand styles into Wine Folly 9 canonical styles');

  // STRICT OLD WORLD APPELLATION VARIETAL RESOLUTION SUITE
  const muscadet = normalizeVarietal(undefined, {
    region: 'Muscadet Sèvre et Maine',
    country: 'France',
  });
  assert(muscadet === 'Melon de Bourgogne', `Muscadet maps directly to legal grape 'Melon de Bourgogne' (got '${muscadet}')`);

  const muscadetChardProtection = normalizeVarietal('Chardonnay', {
    region: 'Muscadet Sèvre et Maine Sur Lie',
    country: 'France',
  });
  assert(
    muscadetChardProtection === 'Melon de Bourgogne',
    `Muscadet protects against false Chardonnay attribution -> strictly 'Melon de Bourgogne' (got '${muscadetChardProtection}')`
  );

  const sancerre = normalizeVarietal(undefined, {
    region: 'Sancerre AOC, Loire Valley',
    country: 'France',
  });
  assert(sancerre === 'Sauvignon Blanc', `Sancerre maps to 'Sauvignon Blanc' (got '${sancerre}')`);

  const pouillyFume = normalizeVarietal('White Wine', {
    region: 'Pouilly-Fumé',
    country: 'France',
  });
  assert(pouillyFume === 'Sauvignon Blanc', `Pouilly-Fumé maps to 'Sauvignon Blanc' (got '${pouillyFume}')`);

  const vouvray = normalizeVarietal(undefined, {
    region: 'Vouvray, Touraine',
    country: 'France',
  });
  assert(vouvray === 'Chenin Blanc', `Vouvray maps to 'Chenin Blanc' (got '${vouvray}')`);

  const condrieu = normalizeVarietal(undefined, {
    region: 'Condrieu AOC, Northern Rhône',
    country: 'France',
  });
  assert(condrieu === 'Viognier', `Condrieu maps to 'Viognier' (got '${condrieu}')`);

  const morgon = normalizeVarietal(undefined, {
    region: 'Morgon Cru Beaujolais',
    country: 'France',
  });
  assert(morgon === 'Gamay', `Morgon Beaujolais maps to 'Gamay' (got '${morgon}')`);

  const rioja = normalizeVarietal(undefined, {
    region: 'Rioja Alta DOCa',
    country: 'Spain',
  });
  assert(rioja === 'Tempranillo', `Rioja maps to 'Tempranillo' (got '${rioja}')`);

  const coteRotie = normalizeVarietal(undefined, {
    region: 'Côte-Rôtie, Northern Rhône',
    country: 'France',
  });
  assert(coteRotie === 'Syrah', `Côte-Rôtie maps to 'Syrah' (got '${coteRotie}')`);

  const hermitage = normalizeVarietal(undefined, {
    region: 'Hermitage',
    country: 'France',
  });
  assert(hermitage === 'Syrah', `Hermitage maps to 'Syrah' (got '${hermitage}')`);

  const { SOMMELIER_WINE_STYLE_ORDER, STANDARD_VINTAGES, OLD_WORLD_APPELLATION_RULES } = await import('../types/cellar');
  assert(
    Array.isArray(OLD_WORLD_APPELLATION_RULES) && OLD_WORLD_APPELLATION_RULES.length >= 10,
    'OLD_WORLD_APPELLATION_RULES exports all 10 legally mandated Old World appellation rules'
  );
  assert(
    OLD_WORLD_APPELLATION_RULES.some((r) => r.mandatedVarietal === 'Melon de Bourgogne' && r.keywords.includes('muscadet')),
    'OLD_WORLD_APPELLATION_RULES includes Muscadet -> Melon de Bourgogne definition'
  );

  // Verification of Delete Feature in CellarStore
  const tempBottle = CellarStore.addBottle({
    producer: 'Domaine de la Pépière',
    wineName: 'Muscadet Sèvre et Maine Clisson',
    varietal: 'Melon de Bourgogne',
    vintage: 2020,
    style: 'Light-Bodied White Wine',
    country: 'France',
    region: 'Muscadet Sèvre et Maine',
    slotId: 'A-R02-C01',
  });
  assert(
    CellarStore.getBottleById(tempBottle.id) !== undefined,
    'addBottle successfully registered temporary test bottle for deletion audit'
  );

  CellarStore.deleteBottle(tempBottle.id);
  assert(
    CellarStore.getBottleById(tempBottle.id) === undefined,
    'deleteBottle immediately deletes bottle by ID and clears it from in-memory cache'
  );
  assert(
    !CellarStore.getBottles().some((b) => b.id === tempBottle.id),
    'deleteBottle ensures deleted bottle is purged from active cellar inventory'
  );

  assert(
    SOMMELIER_WINE_STYLE_ORDER.length === 9 &&
    SOMMELIER_WINE_STYLE_ORDER[0] === 'Sparkling Wine' &&
    SOMMELIER_WINE_STYLE_ORDER[4] === 'Rosé Wine' &&
    SOMMELIER_WINE_STYLE_ORDER[8] === 'Dessert Wine',
    'SOMMELIER_WINE_STYLE_ORDER strictly enforces 9-stage sommelier tasting progression (Sparkling -> Whites -> Rosé -> Reds -> Dessert)'
  );

  assert(
    STANDARD_VINTAGES[0] === 'NV' &&
    STANDARD_VINTAGES.includes(2026) &&
    STANDARD_VINTAGES.includes(1950),
    'STANDARD_VINTAGES provides quick-pick years from 2026 down to 1950 plus Non-Vintage (NV)'
  );

  // ---------------------------------------------------------------------------
  // SUITE 4: Firestore Security Rules Schema & Red Team Audit
  // ---------------------------------------------------------------------------
  console.log('\n4. Firestore Security Rules Schema & Red Team Audit');
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

  assert(
    rulesText.includes("'alcoholPercent'") && rulesText.includes("'drinkingWindow'"),
    'firestore.rules explicitly permits alcoholPercent and drinkingWindow on Bottle create and update'
  );
  assert(
    !rulesText.includes("hasAll(['id', 'user_id', 'producer', 'wineName'"),
    'firestore.rules does not require optional wineName or varietal in hasAll()'
  );
  assert(
    rulesText.includes("data.vintage is int || (data.vintage is string"),
    'firestore.rules supports both integer harvest years and string "NV" vintages'
  );
  assert(
    rulesText.includes("id.matches('^[a-zA-Z0-9_.\\\\-:]+$')"),
    'firestore.rules isValidId permits Apple Sign-In UIDs containing dots'
  );

  // Programmatic validator mirroring firestore.rules isValidBottle
  const allowedBottleKeys = new Set([
    'id', 'user_id', 'producer', 'wineName', 'vintage', 'varietal', 'style',
    'region', 'country', 'subRegion', 'appellation', 'drinkFrom', 'drinkUntil',
    'drinkingWindow', 'alcoholPercent', 'slotId', 'previousSlotId', 'status', 'addedAt', 'updatedAt', 'consumedAt',
    'rating', 'tastingNotes', 'price', 'abv', 'volume', 'visualMode', 'imageUrl', 'imageStoragePath',
    'foodPairing', 'sommelierNote', 'vivinoRating',
    'referenceProfile', 'cellarNotes', 'consumption',
  ]);
  const requiredBottleKeys = ['id', 'user_id', 'producer', 'vintage', 'style', 'country', 'region', 'status', 'addedAt'];

  function simulateFirestoreBottleRule(docData: Record<string, any>, authUid: string): boolean {
    const keys = Object.keys(docData);
    if (!requiredBottleKeys.every((k) => keys.includes(k))) return false;
    if (!keys.every((k) => allowedBottleKeys.has(k))) return false;
    if (docData.user_id !== authUid) return false;
    if (typeof docData.producer !== 'string' || docData.producer.length === 0 || docData.producer.length > 256) return false;
    if ('wineName' in docData && (typeof docData.wineName !== 'string' || docData.wineName.length > 256)) return false;
    if (typeof docData.vintage !== 'number' && typeof docData.vintage !== 'string') return false;
    if ('alcoholPercent' in docData && (typeof docData.alcoholPercent !== 'number' || docData.alcoholPercent < 0 || docData.alcoholPercent > 100)) return false;
    if ('drinkingWindow' in docData && (typeof docData.drinkingWindow !== 'string' || docData.drinkingWindow.length > 128)) return false;
    if (!['in-cellar', 'staging', 'consumed'].includes(docData.status)) return false;
    return true;
  }

  const allStoredForFriendA = CellarStore.getBottles().map((b) => JSON.parse(JSON.stringify(b)));
  assert(
    allStoredForFriendA.length > 0 && allStoredForFriendA.every((b) => simulateFirestoreBottleRule(b, friendA.uid)),
    'All active and consumed bottles (with alcoholPercent, drinkingWindow, rating, and no wineName) pass Firestore rule validation'
  );

  // Red-Team Shadow Update / Ghost Field Attack
  const shadowPayload = { ...allStoredForFriendA[0], isAdmin: true };
  assert(
    !simulateFirestoreBottleRule(shadowPayload, friendA.uid),
    'Red Team Shadow Update Test: Payload with unauthorized ghost field (isAdmin: true) is rejected'
  );

  // Red-Team Cross-Tenant Write Attack
  assert(
    !simulateFirestoreBottleRule(allStoredForFriendA[0], friendB.uid),
    'Red Team Cross-Tenant Test: Writing Friend A bottle under Friend B auth UID is rejected'
  );

  // ---------------------------------------------------------------------------
  // SUITE 5: OAuth Environment Guard & JSON Backup Round-Trip
  // ---------------------------------------------------------------------------
  console.log('\n5. OAuth Popup Environment Guard & Backup Round-Trip');

  assert(
    isSandboxedDevPreview() === false,
    'isSandboxedDevPreview() returns false on published/shared URLs so friends never fall back to owner account'
  );
  assert(
    formatAuthErrorMessage({ code: 'auth/popup-closed-by-user' }, 'Google').includes('closed before completing'),
    'Popup closed by user produces a clear, friendly message instead of silent fallback login'
  );
  assert(
    formatAuthErrorMessage({ code: 'auth/invalid-credential' }, 'Email').includes('Invalid email or password'),
    'Invalid email/password credential produces actionable error message'
  );

  const exportedJson = CellarStore.exportJSON();
  CellarStore.clearCellar();
  assert(CellarStore.getBottles().length === 0, 'clearCellar empties active tenant inventory');

  const importSuccess = CellarStore.importJSON(exportedJson);
  assert(
    importSuccess && CellarStore.getBottles().length === allStoredForFriendA.length,
    'Backup JSON export/import round-trip restores all tenant bottles accurately'
  );

  // ---------------------------------------------------------------------------
  // SUITE 6: Regional Heritage Estate Label Cartography & Appellation Crown
  // ---------------------------------------------------------------------------
  console.log('\n6. Regional Heritage Estate Label Cartography & Appellation Crown');
  const { resolveWineMap, formatAppellationCrown } = await import('../utils/wineRegionMaps');

  const waMap = resolveWineMap('United States', 'Washington / Columbia Gorge');
  assert(
    waMap.countryId === 'us_washington' && waMap.pin.x === 42 && waMap.pin.y === 84,
    'Washington / Columbia Gorge (United States) resolves to Washington State silhouette with Columbia Gorge pin (not Italy)'
  );

  const orMap = resolveWineMap('USA', 'Willamette Valley, Oregon');
  assert(
    orMap.countryId === 'us_oregon',
    'Willamette Valley, Oregon resolves to Oregon State silhouette'
  );

  const caMap = resolveWineMap('USA', 'Napa Valley, California');
  assert(
    caMap.countryId === 'us_california',
    'Napa Valley, California resolves to California State silhouette'
  );

  const itMap = resolveWineMap('Italy', 'Montalcino, Tuscany');
  assert(
    itMap.countryId === 'italy' && itMap.pin.x === 44 && itMap.pin.y === 42,
    'Montalcino, Tuscany (Italy) resolves to Italy silhouette with Tuscany pin'
  );

  assert(
    formatAppellationCrown('Montalcino, Tuscany', 'Italy', false) === 'MONTALCINO, TUSCANY · ITALY',
    'formatAppellationCrown formats full Region · Country crown cleanly'
  );

  // ---------------------------------------------------------------------------
  // SUITE 7: Enumerable Timestamps, Tombstone Persistence & Hydration Gate
  // ---------------------------------------------------------------------------
  console.log('\n7. Enumerable Timestamps, Tombstone Persistence & Hydration Gate');
  const testBottle = CellarStore.addBottle({
    producer: 'Domaine de la Romanee-Conti',
    wineName: 'La Tache',
    vintage: 2019,
    varietal: 'Pinot Noir',
    style: 'Light-Bodied Red Wine',
    country: 'France',
    region: 'Burgundy',
    slotId: 'A-10',
  });
  const spreadCopy = { ...testBottle };
  const jsonCopy = JSON.parse(JSON.stringify(testBottle));
  assert(
    typeof testBottle.updatedAt === 'string' &&
      Object.keys(testBottle).includes('updatedAt') &&
      spreadCopy.updatedAt === testBottle.updatedAt &&
      jsonCopy.updatedAt === testBottle.updatedAt,
    'updatedAt is enumerable and persists through object spread ({ ...bottle }) and JSON.stringify'
  );

  CellarStore.deleteBottle(testBottle.id);
  const rawTombstones = JSON.parse(localStorage.getItem('cellarsync_tombstones_v1') || '[]');
  assert(
    Array.isArray(rawTombstones) && rawTombstones.includes(testBottle.id),
    'deleteBottle writes deleted bottle ID to cellarsync_tombstones_v1 in localStorage'
  );
  assert(
    typeof CellarStore.isHydrating() === 'boolean',
    'CellarStore.isHydrating() exposes reactive hydration boolean state'
  );

  console.log('\n==============================================================');
  console.log(` AUDIT COMPLETE: ${passedCount} passed, ${failedCount} failed`);
  console.log('==============================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPreLaunchAudit().catch((err) => {
  console.error('Unexpected test runner error:', err);
  process.exit(1);
});
