import MigrationBase from "../runner/migration-base.mjs";
import { CORE_PACK_NAME, ITEM_TYPE } from "../../constants.mjs";
import { AcksUtility } from "../../util/acks-utility.mjs";
import MigrationUtil from "../migration-util.mjs";

export class Migration3LanguagesToItems extends MigrationBase {
  static version = 3;

  /** @override — flush after this so any later migration can rely on committed language items. */
  requiresFlush = true;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    // if actor has old languages (array of strings with language names)
    if (source.system?.languages?.value) {
      const langItems = await AcksUtility.getCompendiumDocuments(CORE_PACK_NAME.LANGUAGES);

      for (const actorLanguage of source.system.languages.value) {
        // If Actor already has this language as an item do nothing
        if (
          source.items.some(
            (item) => item.type === ITEM_TYPE.LANGUAGE && item.name.toLowerCase() === actorLanguage.toLowerCase(),
          )
        ) {
          continue;
        }

        // do we have language item in core compendium?
        const langItem = langItems.find((item) => item.name.toLowerCase() === actorLanguage.toLowerCase());
        if (langItem) {
          // add it to items
          const langObject = langItem.toObject();
          delete langObject._id;
          source.items.push(langObject);
        } else {
          // create new language item
          source.items.push({ type: ITEM_TYPE.LANGUAGE, name: actorLanguage, system: { description: "" } });
        }
      }
    }

    MigrationUtil.markPropertyForDeletion(source.system, "languages");
  }
}
