/* global foundry, game */
import {
  DEFAULT_WALKING_SPEED,
  ENCUMBRANCE_LEVEL,
  ENCUMBRANCE_LEVEL_SPEED,
  MOVEMENT_MODE,
  MOVEMENT_MODE_CHOICES,
} from "../../../constants.mjs";

const { EmbeddedDataField, NumberField, SchemaField } = foundry.data.fields;

/**
 * An actor's movement (`system.movement`): a Speed in every Movement Mode, see {@link MovementData}.
 */
export default class MovementField extends EmbeddedDataField {
  constructor(options) {
    super(MovementData, options);
  }
}

/**
 * Speeds of one Movement Mode (`system.movement.<mode>`).
 *
 * Derived properties (not part of the stored schema):
 * @property {number} exploration  Speed after encumbrance, in feet per turn
 * @property {number} combat  Combat Speed in feet per round, a third of `exploration`
 * @property {number} running  Running Speed in feet per round, the same number as `exploration`
 * @property {number} expedition  Expedition Speed in miles per day, a fifth of `exploration`
 */

/**
 * Movement of an actor. It stores one Speed (exploration, feet per turn) for each {@link MOVEMENT_MODE} and derives
 * every other speed from it. Active Effects change a stored Speed (`system.movement.walking.speed`) before
 * encumbrance slows it.
 *
 * Derived properties (not part of the stored schema):
 * @property {number} spelunking  Spelunking Speed in feet per round, a third of the Walking Combat Speed
 * @property {number} sneaking  Sneaking Speed in feet per round, half the Walking Combat Speed
 */
export class MovementData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return Object.fromEntries(
      Object.values(MOVEMENT_MODE).map((mode) => [
        mode,
        new SchemaField({
          speed: new NumberField({
            required: true,
            nullable: false,
            integer: true,
            min: 0,
            initial: mode === MOVEMENT_MODE.WALKING ? DEFAULT_WALKING_SPEED : 0,
            label: MOVEMENT_MODE_CHOICES[mode],
          }),
        }),
      ]),
    );
  }

  /**
   * Derive every speed from the stored Speeds (after Active Effects) and the Encumbrance Level. Encumbrance slows the
   * Speed first, rounded down; each derived speed is then rounded down from that.
   * Called by the owning actor's data model once its Encumbrance Level is known.
   * @param {ENCUMBRANCE_LEVEL} encumbranceLevel
   */
  prepareDerivedData(encumbranceLevel = ENCUMBRANCE_LEVEL.UNENCUMBERED) {
    const share = ENCUMBRANCE_LEVEL_SPEED[encumbranceLevel] ?? 1;
    for (const mode of Object.values(MOVEMENT_MODE)) {
      const speeds = this[mode];
      const exploration = Math.max(0, Math.floor((Number(speeds.speed) || 0) * share));
      Object.assign(speeds, {
        exploration,
        combat: Math.floor(exploration / 3),
        running: exploration,
        expedition: Math.floor(exploration / 5),
      });
    }
    const walkingCombat = this[MOVEMENT_MODE.WALKING].combat;
    this.spelunking = Math.floor(walkingCombat / 3);
    this.sneaking = Math.floor(walkingCombat / 2);
  }

  /**
   * Every Movement Mode in sheet order, with its localised label and speeds. Call after
   * {@link MovementData#prepareDerivedData}.
   * @return {{mode: MOVEMENT_MODE, label: string, speed: number, exploration: number, combat: number,
   *   running: number, expedition: number}[]}
   */
  get modes() {
    return Object.values(MOVEMENT_MODE).map((mode) => ({
      mode,
      label: game.i18n.localize(MOVEMENT_MODE_CHOICES[mode]),
      ...this[mode],
    }));
  }

  //region MIGRATION

  /**
   * Movement Mode keywords of the old free-text monster movement, as written in stat blocks.
   * @type {Readonly<Record<string, MOVEMENT_MODE>>}
   */
  static #LEGACY_KEYWORDS = Object.freeze({
    land: MOVEMENT_MODE.WALKING,
    walk: MOVEMENT_MODE.WALKING,
    burrow: MOVEMENT_MODE.BURROWING,
    climb: MOVEMENT_MODE.CLIMBING,
    fly: MOVEMENT_MODE.FLYING,
    hover: MOVEMENT_MODE.HOVERING,
    swim: MOVEMENT_MODE.SWIMMING,
    web: MOVEMENT_MODE.WEBCRAWLING,
  });

  /**
   * Read Speeds from the old free-text monster movement (`movement.value`). Each part, split on `,` or `;`, is read
   * in either of two forms, taking the Speed (exploration) from it:
   * - ACKS II: `[land|burrow|web|fly|swim|climb] <Combat>' / <Exploration>'`, such as `fly 40' / 120'`
   * - 1st edition: `[keyword] <Exploration>' (<Combat>')`, such as `Fly 150' (50')`
   *
   * No keyword means Walking. A `fly` part with an `H` after a number, or with the word `hover`, is Flying (Hover).
   * A bare number such as `40` or `40'` is not read.
   * @param {string} text
   * @return {Partial<Record<MOVEMENT_MODE, number>>} Speed by Movement Mode, for the modes found
   */
  static parseLegacyMovement(text) {
    const speeds = {};
    for (const part of String(text ?? "").split(/[,;]/)) {
      const segment = part.trim().toLowerCase();
      const keyword = segment.match(/^([a-z]+)/)?.[1];
      let mode = keyword ? MovementData.#legacyMode(keyword) : MOVEMENT_MODE.WALKING;
      if (!mode) continue;
      if (mode === MOVEMENT_MODE.FLYING && /\d\s*'?\s*h\b|\bhover/.test(segment)) {
        mode = MOVEMENT_MODE.HOVERING;
      }
      const ii = segment.match(/(\d+)\s*'?\s*h?\s*\/\s*(\d+)/);
      const first = segment.match(/(\d+)\s*'?\s*h?\s*\(\s*(\d+)/);
      const speed = ii ? Number(ii[2]) : first ? Number(first[1]) : undefined;
      if (speed !== undefined) {
        speeds[mode] = speed;
      }
    }
    return speeds;
  }

  /**
   * Movement Mode of a stat-block keyword, matched on its start so "flying" or "swimming" also count.
   * @param {string} keyword  Lower case
   * @return {MOVEMENT_MODE|undefined}
   */
  static #legacyMode(keyword) {
    const entry = Object.entries(MovementData.#LEGACY_KEYWORDS).find(([word]) => keyword.startsWith(word));
    return entry?.[1];
  }

  /**
   * Whether system data still holds the movement fields from before Movement Modes: `movement.base`,
   * `movement.mod` or `movement.value`. Partial data (an update diff, a token delta) without them is left alone.
   * @param {object} source  Actor system data
   * @return {boolean}
   */
  static hasLegacyMovement(source) {
    const movement = source?.movement;
    return (
      foundry.utils.getType(movement) === "Object" && ("base" in movement || "mod" in movement || "value" in movement)
    );
  }

  /**
   * Convert a character's old movement to a Walking Speed: 120, or the stored exploration speed if movement was
   * not calculated automatically. The old movement bonus is dropped. Mutates `source`; does not delete the old keys.
   * @param {object} source  Character system data
   */
  static migrateCharacterMovement(source) {
    const manual = source.config?.movementAuto === false;
    const exploration = Number(source.movementacks?.exploration);
    const speed = manual && Number.isFinite(exploration) ? exploration : DEFAULT_WALKING_SPEED;
    MovementData.#setSpeeds(source, { [MOVEMENT_MODE.WALKING]: speed });
  }

  /**
   * Convert a monster's old movement to Speeds: Walking from `movement.base` (taken as exploration speed), then
   * every mode read from `movement.value`, whose Walking entry wins over `base`. When either old field held
   * anything (text, or a base other than 120), a labelled copy of both is appended to the biography, unless the
   * data has no `details` (a token delta), where it would replace the actor's whole biography.
   * Mutates `source`; does not delete the old keys.
   * @param {object} source  Monster system data
   */
  static migrateMonsterMovement(source) {
    const { base, value } = source.movement;
    const baseSpeed = Number(base);
    const text = typeof value === "string" ? value.trim() : "";
    const speeds = {};
    if (base !== undefined && base !== null && Number.isFinite(baseSpeed)) {
      speeds[MOVEMENT_MODE.WALKING] = baseSpeed;
    }
    Object.assign(speeds, MovementData.parseLegacyMovement(text));
    MovementData.#setSpeeds(source, speeds);

    const hasBase = base !== undefined && base !== null && baseSpeed !== DEFAULT_WALKING_SPEED;
    if ((text || hasBase) && foundry.utils.getType(source.details) === "Object") {
      source.details.biography = (source.details.biography ?? "") + MovementData.#legacyBackup(base, text);
    }
  }

  /**
   * In-memory conversion for `migrateData()`: convert old movement with the given function, then drop the old
   * keys, so a second call on the same data (Foundry may migrate a source more than once) does nothing.
   * @param {object} source  Actor system data
   * @param {(source: object) => void} convert  {@link MovementData.migrateCharacterMovement} or
   *   {@link MovementData.migrateMonsterMovement}
   */
  static migrateInMemory(source, convert) {
    if (!MovementData.hasLegacyMovement(source)) return;
    convert(source);
    delete source.movement.base;
    delete source.movement.mod;
    delete source.movement.value;
  }

  /**
   * Write Speeds into `source.movement`, rounded down to whole feet, never below 0.
   * @param {object} source
   * @param {Partial<Record<MOVEMENT_MODE, number>>} speeds
   */
  static #setSpeeds(source, speeds) {
    for (const [mode, speed] of Object.entries(speeds)) {
      source.movement[mode] = { speed: Math.max(0, Math.floor(speed)) };
    }
  }

  /**
   * HTML block keeping a monster's old movement fields, so the Judge can check what migration read from them.
   * @param {*} base
   * @param {string} text
   * @return {string}
   */
  static #legacyBackup(base, text) {
    // Only what HTML needs: quotes and apostrophes stay readable in the stored text.
    const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const localize = (key, fallback) => (game.i18n?.has(key) ? game.i18n.localize(key) : fallback);
    const lines = [
      `<h3>${escape(localize("ACKS.movement.backup.title", "Movement before the speed rework (kept by migration)"))}</h3>`,
      `<p>${escape(
        localize(
          "ACKS.movement.backup.hint",
          "This is a copy of the old movement fields. Speeds are now on the Primary Characteristics tab. You can delete this block.",
        ),
      )}</p>`,
    ];
    if (base !== undefined && base !== null) {
      lines.push(`<p>${escape(localize("ACKS.movement.backup.base", "Base"))}: ${escape(String(base))}</p>`);
    }
    if (text) {
      lines.push(`<p>${escape(localize("ACKS.movement.backup.value", "Movement"))}: ${escape(text)}</p>`);
    }
    return `<hr>${lines.join("")}`;
  }

  //endregion MIGRATION
}
