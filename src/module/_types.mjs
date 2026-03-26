/**
 * @typedef {Record<string, DataField>} DataSchema
 */

/**
 * @typedef {DataSchema} ItemDescriptionDataSchema
 * @property {HTMLField} description item description
 */

/**
 * @typedef {DataSchema} ItemPhysicalDataSchema
 * @property {NumberField} cost item cost (in GP?)
 * @property {NumberField} weight old weight handling?
 * @property {NumberField} weight6 weight in 1/6 stone
 */

/**
 * @typedef DragDropConfiguration
 * @property {string|null} [dragSelector=null]  The CSS selector used to target draggable elements.
 * @property {string|null} [dropSelector=null]  The CSS selector used to target viable drop targets.
 * @property {Record<"dragstart"|"drop", (selector: string) => boolean>} [permissions]
 *                                         Permission tests for each action
 * @property {Record<
 *  "dragstart"|"dragover"|"drop"|"dragenter"|"dragleave"|"dragend",
 *  (event: DragEvent) => void
 * >} [callbacks]                         Callback functions for each action
 */

/**
 * @typedef {Object} TRollResult
 * @property {boolean} isSuccess - Whether the roll was a success
 * @property {boolean} isFailure - Whether the roll was a failure
 * @property {number} target - The target number for the roll
 * @property {number} total - The total result of the roll
 * @property {string} [details] - Optional additional details about the roll result
 */

/**
 * @typedef {TRollResult} TAttackRollResult
 * @augments TRollResult
 * @property {string} [victim] - The name of the target of the attack
 */
