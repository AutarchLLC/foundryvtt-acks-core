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
 * @typedef {Object} TRollOptions
 * @property {string[]} parts - The formula parts to be rolled (e.g. ["1d20", "3"])
 * @property {object} data - The data context for the roll (e.g. {roll: {type: "check", target: 15}})
 * @property {boolean} skipDialog - Whether to skip the roll dialog and roll immediately
 * @property {string} title - The title to be displayed in the roll dialog
 * @property {string|null} flavor - Optional flavor text to include in the chat message
 * @property {TChatSpeakerData} speaker - Optional speaker data for the chat message (e.g. {actor: actor, token: token})
 */

/**
 * @typedef {Object} TItemTag
 * @property {string} label
 * @property {string} [icon]
 */

/**
 * @typedef {Object} TAttackThrowData
 * @property {?AcksItem} [item=null] - The item being used for the attack; without one no damage is rolled
 * @property {?ATTACK_TYPE} [attackType=null] - Initially selected attack type; the first available one if not set
 * @property {boolean} [skipDialog=false] - Whether to skip the Attack Throw dialog and use the default choices
 */

/**
 * A roll formula with its data, ready for `new Roll(spec.formula, spec.data)`.
 * @typedef {Object} TRollSpec
 * @property {string} formula - Full roll formula, e.g. "1d20 + 1 - 2"
 * @property {object} data - Roll data used to resolve `@` references in the formula
 * @property {TStringValueWithLabel[]} modifiers - Non-zero modifiers included in the formula, for display
 */

/**
 * @typedef {TRollSpec} TAttackThrowRollSpec
 * @property {number} targetValue - The roll must meet or beat this value to hit (attack throw + target's AC)
 */

/**
 * Choices the player makes in the Attack Throw dialog.
 * @typedef {Object} TAttackThrowChoices
 * @property {ATTACK_TYPE} attackType - Melee, missile or thrown
 * @property {?DAMAGE_MODE} damageMode - Base or alternate damage formula; null without a weapon
 * @property {?ATTACK_RANGE} range - Range band for missile and thrown attacks; null otherwise
 * @property {ATTACK_DIRECTION} direction - Direction the attack comes from (front, flank / rear, backstab / ambush)
 * @property {boolean} subjacent - Whether the target is subjacent (below the attacker)
 * @property {string} situational - Situational modifier formula, e.g. "+2" or "-1d4"
 * @property {string} messageMode - Chat message mode, a key of CONFIG.ChatMessage.modes
 */

/**
 * Options available to the attacker for a given attack type.
 * @typedef {Object} TAttackOptions
 * @property {ATTACK_TYPE[]} attackTypes
 * @property {DAMAGE_MODE[]} damageModes - Empty without a weapon
 * @property {ATTACK_RANGE[]} ranges - Empty for melee attacks
 * @property {ATTACK_DIRECTION[]} directions - Backstab / ambush only in melee or at short range
 */

/**
 * @typedef {TAttackThrowChoices} TAttackThrowResult
 * @property {?TokenDocument} target - Token being attacked
 * @property {TAttackThrowRollSpec} attack - Attack throw
 * @property {?TDamageRollSpec} damage - Damage roll; null without a weapon or damage formula
 */

/**
 * How an attack throw resolved.
 * @typedef {Object} TAttackThrowResolution
 * @property {?number} naturalRoll - Unmodified d20 result
 * @property {number} total - Attack throw total
 * @property {number} targetValue - Value the total had to meet or beat
 * @property {boolean} isHit - Whether the attack hit
 * @property {boolean} isCritical - Whether the hit is a critical hit (doubles damage dice)
 * @property {boolean} isAutomaticHit - Hit because of an unmodified 20 (not with Exploding 20s)
 * @property {boolean} isAutomaticMiss - Missed because of an unmodified 1
 */

/**
 * An attack throw with its rolls and resolution: everything needed for the chat card.
 * @typedef {Object} TAttackThrowOutcome
 * @property {TAttackThrowResult} result - Attack throw details the rolls were made from
 * @property {Roll} attackRoll - Evaluated attack throw roll
 * @property {TAttackThrowResolution} resolution - Hit, miss or critical hit
 * @property {?Roll} damageRoll - Evaluated damage roll; null on a miss, or without a weapon or damage formula
 * @property {?number} damageTotal - Damage dealt: the damage roll total, but at least 1; null without a damage roll
 * @property {{shown: TTargetLabels, hidden: TTargetLabels}} targetLabels - Target and target value labels revealing
 * and hiding the target's AC; show one or the other with `data-acks-visibility`
 */

/**
 * @typedef {Object} TTargetLabels
 * @property {string} target - e.g. "Target: Goblin (AC 4)" or "No target (AC 0)"
 * @property {string} targetValue - e.g. "Hits on 14+" or "Hits on 10 + AC"
 */

/**
 * @typedef {TRollSpec} TDamageRollSpec
 * @property {DAMAGE_TYPE[]} types - Damage types dealt
 * @property {boolean} extraordinary - Whether the damage is extraordinary
 */

/**
 * @typedef {ApplicationConfiguration} TAttackThrowDialogConfiguration
 * @property {AcksActor} actor - Attacker
 * @property {?AcksItem} [item=null] - Item used to attack
 * @property {?TokenDocument} [target=null] - Token being attacked
 * @property {Partial<TAttackThrowChoices>} [choices={}] - Initially selected choices
 */

/**
 * @typedef {Object} TItemRollOptions
 * @property {boolean} [skipDialog=undefined] - Whether to skip the roll dialog and roll immediately
 */

/**
 * @typedef {Object} TChatSpeakerData
 * @property {string} [actor] - The _id of the Actor who generated this message
 * @property {string} [alias] - An overridden alias name used instead of the Actor or Token name
 * @property {string} [scene] - The _id of the Scene where this message was created
 * @property {string} [token] - The _id of the Token who generated this message
 */

/**
 * @typedef {Object} TChatMessageData
 * @property {boolean} [blind=false] - Is this message sent blindly where the creating User cannot see it?
 * @property {string} [content] - The HTML content of this chat message
 * @property {boolean} [emote=false] - Is this message styled as an emote?
 * @property {DocumentFlags} [flags] - An object of optional key/value flags
 * @property {string} [flavor=""] - An optional flavor text message which summarizes this message
 * @property {string[]} [rolls=[]] - Serialized content of any Roll instances attached to the ChatMessage
 * @property {string} [sound=""] - The URL of an audio file which plays when this message is received
 * @property {TChatSpeakerData} [speaker] - A ChatSpeakerData object which describes the origin of the ChatMessage
 * @property {ChatMessageStyle} [style] - The message style from CONST.CHAT_MESSAGE_STYLES
 * @property {Object} [system] - Data for a ChatMessage subtype, defined by a System or Module
 * @property {string} [title=""] - An optional title used if the message is popped-out
 * @property {string} [type="base"] - The type of this chat message, in BaseChatMessage.metadata.types
 * @property {string} [author] - The _id of the User document who generated this message
 * @property {string[]} [whisper] - An array of User _id values to whom this message is privately whispered
 */

/**
 * @typedef {Object} TChatMessageHookChatData
 * @property {ChatSpeakerData} speaker - The identified speaker data, see foundry.documents.ChatMessage.getSpeaker
 * @property {string} user - The id of the User sending the message
 * @see https://foundryvtt.com/api/classes/foundry.documents.ChatMessage.html#getspeaker
 * @see https://foundryvtt.com/api/functions/hookEvents.chatMessage.html
 */

/**
 * @callback ChatCommandCallback
 * Called in the context of a ChatLog instance.
 * @param {string} command - The matched command name.
 * @param {RegExpMatchArray|RegExpMatchArray[]|string[]} match - The regex match result.
 * @param {object} chatData - Chat message data.
 * @param {object} createOptions - Options passed to ChatMessage.create.
 * @returns {Promise<false|void>} - Return false to prevent message creation.
 */

/**
 * @typedef {Object} ChatCommandPattern
 * @property {RegExp} rgx - The regular expression pattern used to match this command.
 * @property {ChatCommandCallback} fn - The processing function invoked when this command is matched.
 * @property {keyof CONFIG.ChatMessage.modes} [mode] - A chat message mode to enforce for this command. Otherwise,
 * the default message mode is applied.
 * @property {boolean} [isRoll=false] - Is this command related to rolling dice?
 * @property {boolean} [isMultiline=false] - Can this command be processed over multiple lines?
 */

/**
 * @typedef {Object} TNumValueWithLabel
 * @property {string} label - The human-readable label for this value.
 * @property {number} value - The underlying value.
 */

/**
 * @typedef {Object} TStringValueWithLabel
 * @property {string} label - The human-readable label for this value.
 * @property {string} value - The underlying value.
 */

/**
 * @callback TDialogV2ButtonCallback
 * @param {PointerEvent | SubmitEvent} event - The button click event, or a form submission event if the dialog
 * was submitted via keyboard.
 * @param {HTMLButtonElement} button - If the form was submitted via keyboard, this will be the default button,
 * otherwise the button that was clicked.
 * @param {foundry.applications.api.DialogV2} dialog - The DialogV2 instance.
 * @returns {Promise<any>}
 */

/**
 * @typedef {Object} TDialogV2Button
 * @property {string} action - The button action identifier.
 * @property {TDialogV2ButtonCallback} [callback] - A function to invoke when the button is clicked. The value returned
 * from this function will be used as the dialog's submitted value. Otherwise, the button's identifier is used.
 * @property {string} [class] - CSS classes to apply to the button.
 * @property {boolean} [default=false] - Whether this button is autofocused.
 * @property {boolean} [disabled=false] - Whether the button is disabled.
 * @property {string} [icon] - FontAwesome icon classes.
 * @property {string} label - The button label. Will be localized.
 * @property {Record<string, string>} [style] - CSS style to apply to the button.
 * @property {string} [tooltip] - The tooltip of the button.
 * @property {string} [type] - The button type.
 */
