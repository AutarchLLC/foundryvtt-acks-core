export const ITEM_TYPE = Object.freeze({
  ITEM: "item",
  WEAPON: "weapon",
  ARMOR: "armor",
  SPELL: "spell",
  PROFICIENCY: "ability",
  LANGUAGE: "language",
  MONEY: "money",
  BUNDLE: "bundle",
});

export const DEFAULT_MONSTER_ITEM_OPTIONS = Object.freeze([
  { value: ITEM_TYPE.WEAPON, label: "TYPES.Item.weapon" },
  { value: ITEM_TYPE.ARMOR, label: "TYPES.Item.armor" },
  { value: ITEM_TYPE.PROFICIENCY, label: "TYPES.Item.ability" },
  { value: ITEM_TYPE.ITEM, label: "TYPES.Item.item" },
]);

/** Monster Saving Throw Key*/
export const MSS_KEY = Object.freeze({
  F0: "F0",
  F1: "F1",
  F2_3: "F2_3",
  F4: "F4",
  F5_6: "F5_6",
  F7: "F7",
  F8_9: "F8_9",
  F10: "F10",
  F11_12: "F11_12",
  F13: "F13",
  F14_15: "F14_15",
  F16: "F16",
  F17_18: "F17_18",
  F19: "F19",
  F20_21: "F20_21",
  F22: "F22",
  F23: "F23",
  C1_2: "C1_2",
  C3_4: "C3_4",
  C5_6: "C5_6",
  C7_8: "C7_8",
  C9_10: "C9_10",
  C11_12: "C11_12",
  C13_14: "C13_14",
  T1_2: "T1_2",
  T3_4: "T3_4",
  T5_6: "T5_6",
  T7_8: "T7_8",
  T9_10: "T9_10",
  T11_12: "T11_12",
  T13_14: "T13_14",
  M1_3: "M1_3",
  M4_6: "M4_6",
  M7_9: "M7_9",
  M10_12: "M10_12",
  M13_14: "M13_14",
  D1: "D1",
  D2_3: "D2_3",
  D4: "D4",
  D5_6: "D5_6",
  D7: "D7",
  D8_9: "D8_9",
  D10: "D10",
  D11_12: "D11_12",
  D13: "D13",
  E1: "E1",
  E2_3: "E2_3",
  E4: "E4",
  E5_6: "E5_6",
  E7: "E7",
  E8_9: "E8_9",
  E10: "E10",
});

export const MONSTER_SAVES_OPTIONS = Object.freeze([
  { value: MSS_KEY.F0, label: "Fighter, F0" },
  { value: MSS_KEY.F1, label: "Fighter, F1" },
  { value: MSS_KEY.F2_3, label: "Fighter, F2 - F3" },
  { value: MSS_KEY.F4, label: "Fighter, F4" },
  { value: MSS_KEY.F5_6, label: "Fighter, F5 - F6" },
  { value: MSS_KEY.F7, label: "Fighter, F7" },
  { value: MSS_KEY.F8_9, label: "Fighter, F8 - F9" },
  { value: MSS_KEY.F10, label: "Fighter, F10" },
  { value: MSS_KEY.F11_12, label: "Fighter, F11 - F12" },
  { value: MSS_KEY.F13, label: "Fighter, F13" },
  { value: MSS_KEY.F14_15, label: "Fighter, F14 - F15" },
  { value: MSS_KEY.F16, label: "Fighter, F16" },
  { value: MSS_KEY.F17_18, label: "Fighter, F17 - F18" },
  { value: MSS_KEY.F19, label: "Fighter, F19" },
  { value: MSS_KEY.F20_21, label: "Fighter, F20 - F21" },
  { value: MSS_KEY.F22, label: "Fighter, F22" },
  { value: MSS_KEY.F23, label: "Fighter, F23+" },
  { value: MSS_KEY.C1_2, label: "Crusader, C1 - C2" },
  { value: MSS_KEY.C3_4, label: "Crusader, C3 - C4" },
  { value: MSS_KEY.C5_6, label: "Crusader, C5 - C6" },
  { value: MSS_KEY.C7_8, label: "Crusader, C7 - C8" },
  { value: MSS_KEY.C9_10, label: "Crusader, C9 - C10" },
  { value: MSS_KEY.C11_12, label: "Crusader, C11 - C12" },
  { value: MSS_KEY.C13_14, label: "Crusader, C13 - C14" },
  { value: MSS_KEY.T1_2, label: "Thief, T1 - T2" },
  { value: MSS_KEY.T3_4, label: "Thief, T3 - T4" },
  { value: MSS_KEY.T5_6, label: "Thief, T5 - T6" },
  { value: MSS_KEY.T7_8, label: "Thief, T7 - T8" },
  { value: MSS_KEY.T9_10, label: "Thief, T9 - T10" },
  { value: MSS_KEY.T11_12, label: "Thief, T11 - T12" },
  { value: MSS_KEY.T13_14, label: "Thief, T13 - T14" },
  { value: MSS_KEY.M1_3, label: "Mage, M1 - M3" },
  { value: MSS_KEY.M4_6, label: "Mage, M4 - M6" },
  { value: MSS_KEY.M7_9, label: "Mage, M7 - M9" },
  { value: MSS_KEY.M10_12, label: "Mage, M10 - M12" },
  { value: MSS_KEY.M13_14, label: "Mage, M13 - M14" },
  { value: MSS_KEY.D1, label: "Dwarven Vaultguard, D1" },
  { value: MSS_KEY.D2_3, label: "Dwarven Vaultguard, D2 - D3" },
  { value: MSS_KEY.D4, label: "Dwarven Vaultguard, D4" },
  { value: MSS_KEY.D5_6, label: "Dwarven Vaultguard, D5 - D6" },
  { value: MSS_KEY.D7, label: "Dwarven Vaultguard, D7" },
  { value: MSS_KEY.D8_9, label: "Dwarven Vaultguard, D8 - D9" },
  { value: MSS_KEY.D10, label: "Dwarven Vaultguard, D10" },
  { value: MSS_KEY.D11_12, label: "Dwarven Vaultguard, D11 - D12" },
  { value: MSS_KEY.D13, label: "Dwarven Vaultguard, D13" },
  { value: MSS_KEY.E1, label: "Elven Spellsword, E1" },
  { value: MSS_KEY.E2_3, label: "Elven Spellsword, E2 - E3" },
  { value: MSS_KEY.E4, label: "Elven Spellsword, E4" },
  { value: MSS_KEY.E5_6, label: "Elven Spellsword, E5 - E6" },
  { value: MSS_KEY.E7, label: "Elven Spellsword, E7" },
  { value: MSS_KEY.E8_9, label: "Elven Spellsword, E8 - E9" },
  { value: MSS_KEY.E10, label: "Elven Spellsword, E10" },
]);

export const MONSTER_SAVING_THROW_LUT = Object.freeze({
  // Fighter Saving Throws
  [MSS_KEY.F0]: { p: 14, d: 15, b: 16, i: 17, s: 18 },
  [MSS_KEY.F1]: { p: 13, d: 14, b: 15, i: 16, s: 17 },
  [MSS_KEY.F2_3]: { p: 12, d: 13, b: 14, i: 15, s: 16 },
  [MSS_KEY.F4]: { p: 11, d: 12, b: 13, i: 14, s: 15 },
  [MSS_KEY.F5_6]: { p: 10, d: 11, b: 12, i: 13, s: 14 },
  [MSS_KEY.F7]: { p: 9, d: 10, b: 11, i: 12, s: 13 },
  [MSS_KEY.F8_9]: { p: 8, d: 9, b: 10, i: 11, s: 12 },
  [MSS_KEY.F10]: { p: 7, d: 8, b: 9, i: 10, s: 11 },
  [MSS_KEY.F11_12]: { p: 6, d: 7, b: 8, i: 9, s: 10 },
  [MSS_KEY.F13]: { p: 5, d: 6, b: 7, i: 8, s: 9 },
  [MSS_KEY.F14_15]: { p: 4, d: 5, b: 6, i: 7, s: 8 },
  [MSS_KEY.F16]: { p: 3, d: 4, b: 5, i: 6, s: 7 },
  [MSS_KEY.F17_18]: { p: 2, d: 3, b: 4, i: 5, s: 6 },
  [MSS_KEY.F19]: { p: 2, d: 2, b: 3, i: 4, s: 5 },
  [MSS_KEY.F20_21]: { p: 2, d: 2, b: 2, i: 3, s: 4 },
  [MSS_KEY.F22]: { p: 2, d: 2, b: 2, i: 2, s: 3 },
  [MSS_KEY.F23]: { p: 2, d: 2, b: 2, i: 2, s: 2 },
  // Crusader Saving Throws
  [MSS_KEY.C1_2]: { p: 13, d: 10, b: 16, i: 13, s: 15 },
  [MSS_KEY.C3_4]: { p: 12, d: 9, b: 15, i: 12, s: 14 },
  [MSS_KEY.C5_6]: { p: 11, d: 8, b: 14, i: 11, s: 13 },
  [MSS_KEY.C7_8]: { p: 10, d: 7, b: 13, i: 10, s: 12 },
  [MSS_KEY.C9_10]: { p: 9, d: 6, b: 12, i: 9, s: 11 },
  [MSS_KEY.C11_12]: { p: 8, d: 5, b: 11, i: 8, s: 10 },
  [MSS_KEY.C13_14]: { p: 7, d: 4, b: 10, i: 7, s: 9 },
  // Thief Saving Throws
  [MSS_KEY.T1_2]: { p: 13, d: 13, b: 13, i: 14, s: 15 },
  [MSS_KEY.T3_4]: { p: 12, d: 12, b: 12, i: 13, s: 14 },
  [MSS_KEY.T5_6]: { p: 11, d: 11, b: 11, i: 12, s: 13 },
  [MSS_KEY.T7_8]: { p: 10, d: 10, b: 10, i: 11, s: 12 },
  [MSS_KEY.T9_10]: { p: 9, d: 9, b: 9, i: 10, s: 11 },
  [MSS_KEY.T11_12]: { p: 8, d: 8, b: 8, i: 9, s: 10 },
  [MSS_KEY.T13_14]: { p: 7, d: 7, b: 7, i: 8, s: 9 },
  // Mage Saving Throws
  [MSS_KEY.M1_3]: { p: 13, d: 13, b: 15, i: 11, s: 12 },
  [MSS_KEY.M4_6]: { p: 12, d: 12, b: 14, i: 10, s: 11 },
  [MSS_KEY.M7_9]: { p: 11, d: 11, b: 13, i: 9, s: 10 },
  [MSS_KEY.M10_12]: { p: 10, d: 10, b: 12, i: 8, s: 9 },
  [MSS_KEY.M13_14]: { p: 9, d: 9, b: 11, i: 7, s: 8 },
  // Dwarven Vaultguard Saving Throws
  [MSS_KEY.D1]: { p: 9, d: 10, b: 12, i: 12, s: 13 },
  [MSS_KEY.D2_3]: { p: 8, d: 9, b: 11, i: 11, s: 12 },
  [MSS_KEY.D4]: { p: 7, d: 8, b: 10, i: 10, s: 11 },
  [MSS_KEY.D5_6]: { p: 6, d: 7, b: 9, i: 9, s: 10 },
  [MSS_KEY.D7]: { p: 5, d: 6, b: 8, i: 8, s: 9 },
  [MSS_KEY.D8_9]: { p: 4, d: 5, b: 7, i: 7, s: 8 },
  [MSS_KEY.D10]: { p: 3, d: 4, b: 6, i: 6, s: 7 },
  [MSS_KEY.D11_12]: { p: 2, d: 3, b: 5, i: 5, s: 6 },
  [MSS_KEY.D13]: { p: 1, d: 2, b: 4, i: 4, s: 5 },
  // Elven Spellsword Saving Throws
  [MSS_KEY.E1]: { p: 12, d: 14, b: 15, i: 16, s: 16 },
  [MSS_KEY.E2_3]: { p: 11, d: 13, b: 14, i: 15, s: 15 },
  [MSS_KEY.E4]: { p: 10, d: 12, b: 13, i: 14, s: 14 },
  [MSS_KEY.E5_6]: { p: 9, d: 11, b: 12, i: 13, s: 13 },
  [MSS_KEY.E7]: { p: 8, d: 10, b: 11, i: 12, s: 12 },
  [MSS_KEY.E8_9]: { p: 7, d: 9, b: 10, i: 11, s: 11 },
  [MSS_KEY.E10]: { p: 6, d: 8, b: 9, i: 10, s: 10 },
});

export const ATTRIBUTE_MODIFIERS_LUT = Object.freeze({
  3: -3,
  4: -2,
  5: -2,
  6: -1,
  7: -1,
  8: -1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: +1,
  14: +1,
  15: +1,
  16: +2,
  17: +2,
  18: +3,
});

export const INTERNAL_TABLES_PATH = "systems/acks/ruledata/internal_tables.json";

export const MORTAL_WOUNDS_TREATMENT_TIMING = Object.freeze({
  2: { label: "Treatment within 1 Round (+2)", value: 2 },
  "-3": { label: "Treatment within 1 Turn of Injury (-3)", value: -3 },
  "-5": { label: "Treatment within 1 Hour of Injury (-5)", value: -5 },
  "-8": { label: "Treatment within 1 Day of Injury (-8)", value: -8 },
  "-10": { label: "Treatment more than 1 day after Injury (-10)", value: -10 },
});

export const MORTAL_WOUNDS_SPELL_LEVELS = Object.freeze({
  0: "None (0)",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
});

export const HIT_DICE_MODIFIERS = Object.freeze({
  d4: { value: 0, label: "d4 (0)" },
  d6: { value: 2, label: "d6 (2)" },
  d8: { value: 4, label: "d8 (4)" },
  d10: { value: 6, label: "d10 (6)" },
  d12: { value: 8, label: "d12 (8)" },
});

export const MORTAL_WOUNDS_CLASS_LEVELS = Object.freeze({
  0: "Not applicable",
  1: "1 (+0)",
  2: "2 (+1)",
  3: "3 (+2)",
  4: "4 (+2)",
  5: "5 (+2)",
  6: "6 (+3)",
  7: "7 (+4)",
  8: "8 (+4)",
  9: "9 (+4)",
  10: "10 (+5)",
  11: "11 (+6)",
  12: "12 (+6)",
  13: "13 (+6)",
  14: "14 (+7)",
});

export const MORTAL_WOUNDS_HEALING_PROF = Object.freeze({
  0: "None (0)",
  1: "1",
  2: "2",
  3: "3",
});

export const TAMPERING_LIFE_SPAN = Object.freeze({
  2: { label: "Youthful (+2)", value: 2 },
  0: { label: "Adult (0)", value: 0 },
  "-5": { label: "Middle Aged (-5)", value: -5 },
  "-10": { label: "Old (-10)", value: -10 },
  "-20": { label: "Ancient (-20)", value: -20 },
});

export const TAMPERING_SPINE = Object.freeze({
  0: { label: "None (0)", value: 0 },
  "-5": { label: "1 (-5)", value: -5 },
  "-10": { label: "2 (-10)", value: -10 },
});

export const TAMPERING_LIMBS = Object.freeze({
  0: { label: "None (0)", value: 0 },
  "-2": { label: "1 (-2)", value: -2 },
  "-4": { label: "2 (-4)", value: -4 },
  "-6": { label: "3 (-6)", value: -6 },
  "-8": { label: "4 (-8)", value: -8 },
  "-10": { label: "5 (-10)", value: -10 },
  "-12": { label: "6 (-12)", value: -12 },
  "-14": { label: "7 (-14)", value: -14 },
  "-16": { label: "8 (-16)", value: -16 },
});

/**
 * Represents the detection state of one side in an encounter.
 * - `forelos` - Both forewarned AND has line of sight
 * - `fore`    - Forewarned only (heard/smelled, but no direct sight)
 * - `los`     - Line of sight only (spotted, but not forewarned)
 * - `none`    - Neither forewarned nor line of sight
 * @typedef {'forelos' | 'fore' | 'los' | 'none'} SurpriseDetectionState
 */

/**
 * Surprise state for the monster side of an encounter.
 * @typedef {Object} SurpriseMonsterState
 * @property {boolean} canBeSurprised - Whether the monster can be surprised in this scenario
 * @property {number}  modifier       - Modifier applied to the monster's surprise roll
 */

/**
 * Surprise state for the adventurer side of an encounter.
 * @typedef {Object} SurpriseAdventurerState
 * @property {boolean} canBeSurprised - Whether the adventurer can be surprised in this scenario
 * @property {number}  modifier       - Modifier applied to the adventurer's surprise roll
 * @property {boolean} canEvade       - Whether the adventurer can attempt to evade the encounter
 */

/**
 * A single cell in the surprise matrix, describing the outcome for a specific
 * combination of adventurer and monster detection states.
 * @typedef {Object} SurpriseMatrixEntry
 * @property {boolean}               isEncounter  - Whether this combination results in an encounter
 * @property {SurpriseMonsterState}     monster      - Monster surprise data for this combination
 * @property {SurpriseAdventurerState}  adventurer   - Adventurer surprise data for this combination
 * @property {string}                description  - Localization key describing this scenario
 */

/**
 * One row of the surprise matrix, keyed by the monster's {@link SurpriseDetectionState}.
 * @typedef {Record<SurpriseDetectionState, SurpriseMatrixEntry>} SurpriseMatrixRow
 */

/**
 * @typedef {Readonly<Record<SurpriseDetectionState, SurpriseMatrixRow>>} SurpriseMatrixLUT
 */

/**
 * A two-dimensional lookup table for ACKS II surprise mechanics.
 *
 * Usage: `SURPRISE_MATRIX[adventurerDetection][monsterDetection]`
 *
 * The outer key is the **adventurer** party's detection state; the inner key
 * is the **monster** party's detection state. Each cell describes whether an
 * encounter occurs, whether each side can be surprised, applicable modifiers,
 * and whether the adventurers may evade.
 * @type {SurpriseMatrixLUT}
 */
export const SURPRISE_MATRIX = Object.freeze({
  forelos: {
    forelos: {
      isEncounter: true,
      monster: {
        canBeSurprised: false,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: false,
        modifier: 0,
        canEvade: false,
      },
      description: "ACKS.surprise.forelos.forelos",
    },
    fore: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 1,
      },
      adventurer: {
        canBeSurprised: false,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.forelos.fore",
    },
    los: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: false,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.forelos.los",
    },
    none: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: -1,
      },
      adventurer: {
        canBeSurprised: false,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.forelos.none",
    },
  },
  fore: {
    forelos: {
      isEncounter: true,
      monster: {
        canBeSurprised: false,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 1,
        canEvade: false,
      },
      description: "ACKS.surprise.fore.forelos",
    },
    fore: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 1,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 1,
        canEvade: true,
      },
      description: "ACKS.surprise.fore.fore",
    },
    los: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 1,
        canEvade: true,
      },
      description: "ACKS.surprise.fore.los",
    },
    none: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: -1,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 1,
        canEvade: true,
      },
      description: "ACKS.surprise.fore.none",
    },
  },
  los: {
    forelos: {
      isEncounter: true,
      monster: {
        canBeSurprised: false,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 0,
        canEvade: false,
      },
      description: "ACKS.surprise.los.forelos",
    },
    fore: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 1,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.los.fore",
    },
    los: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.los.los",
    },
    none: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: -1,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: 0,
        canEvade: true,
      },
      description: "ACKS.surprise.los.none",
    },
  },
  none: {
    forelos: {
      isEncounter: true,
      monster: {
        canBeSurprised: false,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: -1,
        canEvade: false,
      },
      description: "ACKS.surprise.none.forelos",
    },
    fore: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 1,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: -1,
        canEvade: false,
      },
      description: "ACKS.surprise.none.fore",
    },
    los: {
      isEncounter: true,
      monster: {
        canBeSurprised: true,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: true,
        modifier: -1,
        canEvade: false,
      },
      description: "ACKS.surprise.none.los",
    },
    none: {
      isEncounter: false,
      monster: {
        canBeSurprised: false,
        modifier: 0,
      },
      adventurer: {
        canBeSurprised: false,
        modifier: 0,
        canEvade: false,
      },
      description: "ACKS.surprise.none.none",
    },
  },
});
