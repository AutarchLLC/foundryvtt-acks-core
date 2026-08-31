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

/**
 * @typedef {Object} TRollOptions
 * @property {string[]} [parts=[]] - The formula parts to be rolled (e.g. ["1d20", "3"])
 * @property {object} [data={}] - The data context for the roll (e.g. {roll: {type: "check", target: 15}})
 * @property {boolean} [skipDialog=false] - Whether to skip the roll dialog and roll immediately
 * @property {string} [title=""] - The title to be displayed in the roll dialog
 * @property {string|null} [flavor=null] - Optional flavor text to include in the chat message
 * @property {object} [speaker=null] - Optional speaker data for the chat message (e.g. {actor: actor, token: token})
 */

/**
 * @typedef {Object} TItemTag
 * @property {string} label
 * @property {string} [icon]
 */

/**
 * @typedef {Object} TItemRollOptions
 * @property {boolean} [skipDialog=undefined] - Whether to skip the roll dialog and roll immediately
 */

/**
 * @typedef {Object} TRollAttackOptions
 * @property {boolean} [skipDialog=undefined] - Whether to skip the roll dialog and roll immediately
 * @property {ATTACK_TYPE} [attackType=undefined] - The type of attack (see ATTACK_TYPE global constant)
 */

/**
 * @typedef {Object} TItemRollConfig
 * @property {SAVING_THROW} save - The type of saving throw (see SAVING_THROW global constant)
 * @property {Token|null} [target]
 */

/**
 * @typedef {Object} TItemRollData
 * @property {Object} [item] - Used Item, the extracted primitive object from Item's DataModel
 * @property {Object} actor - Actor who used the Item, the extracted primitive object from Actor's DataModel
 * @property {TItemRollConfig} roll - roll configuration
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
