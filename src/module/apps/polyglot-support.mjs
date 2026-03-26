/* global Hooks, game */
// Apps hooks
// https://github.com/mclemente/fvtt-module-polyglot/wiki/API
// TODO: check if this still works
export default class AcksPolyglot {
  static init() {
    Hooks.once("polyglot.init", (LanguageProvider) => {
      class AcksLanguageProvider extends LanguageProvider {
        requiresReady = true;

        getSystemDefaultLanguage() {
          return "Common Auran";
        }

        async getLanguages() {
          if (this.replaceLanguages) {
            this.languages = {};
            return;
          }
          const demonlordPack = game.packs.get("acks.acks-languages");
          const demonlordItemList = await demonlordPack.getIndex();
          const languagesSetting = game.settings.get("polyglot", "Languages");
          for (const item of demonlordItemList) {
            const originalName = item?.flags?.babele?.originalName || item.name;
            this.languages[originalName] = {
              label: item.name,
              font: languagesSetting[originalName]?.font || this.languages[originalName]?.font || this.defaultFont,
              rng: languagesSetting[originalName]?.rng ?? "default",
            };
          }
        }

        getUserLanguages(actor) {
          const knownLanguages = new Set();
          const literateLanguages = new Set();
          for (const item of actor.items) {
            if (item.type === "language") {
              const name = item?.flags?.babele?.originalName || item.name;
              knownLanguages.add(name);
              if (actor.system.scores.int.value >= 9) {
                literateLanguages.add(name);
              }
            }
          }
          return [knownLanguages, literateLanguages];
        }

        conditions(lang) {
          return game.polyglot.literateLanguages.has(lang);
        }
      }

      game.polyglot.api.registerSystem(AcksLanguageProvider);
    });
  }
}
