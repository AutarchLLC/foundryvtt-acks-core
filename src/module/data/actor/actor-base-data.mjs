import BaseDataModel from "../common/base-data-model.mjs";
import { ITEM_TYPE } from "../../constants.mjs";

/**
 * Base Data Model for every actor type. Derives the stats all actors share; each actor type adds its own
 * derived stats through {@link ActorBaseData#_prepareTypeData}.
 *
 * Data preparation runs on every client and never writes to the database, so every client derives the same values.
 *
 * Derived properties (not part of the stored schema):
 * @property {number} initiative.value  Initiative bonus rolled as `1d6 + @initiative.value`
 * @property {MovementData} movement  Every speed, derived from the stored Speeds and the Encumbrance Level
 */
export default class ActorBaseData extends BaseDataModel {
  /**
   * Derive the stats every actor shares, after the actor type has derived its own.
   * Actor types extend {@link ActorBaseData#_prepareTypeData} and {@link ActorBaseData#_initiativeBonus}
   * instead of this method, so the order stays fixed.
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareTypeData();
    this.initiative.value = (this.initiative.mod || 0) + this._initiativeBonus;
    this.movement.prepareDerivedData(this.encumbrance.level);
  }

  /**
   * Derive the stats specific to this actor type. Runs before the shared stats, which may depend on it
   * (`encumbrance.level` for movement, the initiative bonus).
   * @protected
   */
  _prepareTypeData() {}

  /**
   * Initiative bonus from this actor type, added to `initiative.mod`.
   * @type {number}
   * @protected
   */
  get _initiativeBonus() {
    return 0;
  }

  /**
   * Encumbrance of carried coins: every 1,000 coins weigh 1 stone, the rest count as items (1 per 166 coins).
   * @return {{stone: number, item: number}}
   */
  getTotalMoneyEncumbrance() {
    let total = 0;
    for (const item of this.parent.items) {
      if (item.type === ITEM_TYPE.MONEY) {
        total += item.system.quantity;
      }
    }
    const nbStone = Math.floor(total / 1000);
    const nbItems = Math.ceil((total - nbStone * 1000) / 166);
    return { stone: nbStone, item: nbItems };
  }
}
