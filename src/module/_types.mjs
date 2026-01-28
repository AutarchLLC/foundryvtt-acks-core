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
