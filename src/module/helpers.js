import { ACKS } from "./config.js";

export const registerHelpers = async function () {
  // Handlebars template helpers
  Handlebars.registerHelper("eq", function (a, b) {
    return a == b;
  });

  Handlebars.registerHelper("gt", function (a, b) {
    return a >= b;
  });

  Handlebars.registerHelper("toFixed", function (number, digits) {
    if (!Number(number)) {
      number = 0;
    }
    if (!Number(digits)) {
      digits = 0;
    }
    return Number(number).toFixed(digits);
  });

  Handlebars.registerHelper("mod", function (val) {
    if (val > 0) {
      return `+${val}`;
    } else if (val < 0) {
      return `${val}`;
    } else {
      return "0";
    }
  });

  Handlebars.registerHelper("add", function (lh, rh) {
    return parseInt(lh) + parseInt(rh);
  });

  Handlebars.registerHelper("subtract", function (lh, rh) {
    return parseInt(lh) - parseInt(rh);
  });

  Handlebars.registerHelper("fsubtract", (lh, rh) => {
    return parseFloat(lh) - parseFloat(rh);
  });

  Handlebars.registerHelper("divide", function (lh, rh) {
    return Math.floor(parseFloat(lh) / parseFloat(rh));
  });

  Handlebars.registerHelper("fdivide", (lh, rh) => {
    return parseFloat(lh) / parseFloat(rh);
  });

  Handlebars.registerHelper("mult", function (lh, rh) {
    return parseFloat(lh) * parseFloat(rh);
  });

  Handlebars.registerHelper("multround", function (lh, rh) {
    return Math.round(parseFloat(lh) * parseFloat(rh) * 100) / 100;
  });

  Handlebars.registerHelper("roundTreas", function (value) {
    return Math.round(value * 100) / 100;
  });

  Handlebars.registerHelper("getWeightTooltip", function (weight, maxWeight) {
    if (weight > maxWeight) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Overburdened");
    } else if (weight > 10) {
      return game.i18n.localize("ACKS.EncumbranceTitle.High");
    } else if (weight > 7) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Medium");
    } else if (weight > 5) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Low");
    } else {
      return game.i18n.localize("ACKS.EncumbranceTitle.Unencumbered");
    }
  });

  Handlebars.registerHelper("getWeight6Tooltip", function (weight, maxWeight) {
    if (weight > maxWeight) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Overburdened");
    } else if (weight > 60) {
      return game.i18n.localize("ACKS.EncumbranceTitle.High");
    } else if (weight > 42) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Medium");
    } else if (weight > 30) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Low");
    } else {
      return game.i18n.localize("ACKS.EncumbranceTitle.Unencumbered");
    }
  });

  Handlebars.registerHelper("getTagIcon", function (tag) {
    const index = Object.keys(ACKS.tags).find((k) => ACKS.tags[k] === tag);
    return ACKS.tag_images[index];
  });

  Handlebars.registerHelper("generateTags", function (tagList) {
    const tagKeys = Object.keys(ACKS.tags);
    const tagValues = Object.values(ACKS.tags);
    const icons = [];
    const text = [];
    for (const tag of tagList) {
      if (tagValues.includes(tag.value)) {
        const tagKey = tagKeys[tagValues.indexOf(tag.value)];
        icons.push(
          `<div class="tag-icon" data-tooltip="${ACKS.tags[tagKey]}"><i class="${ACKS.tag_icons[tagKey]}"></i></div>`,
        );
      } else {
        text.push(`<div class="tag">${tag.value}</div>`);
      }
    }

    return new Handlebars.SafeString([...icons, ...text].join(""));
  });

  const myClamp = (num, min, max) => Math.min(Math.max(num, min), max);
  Handlebars.registerHelper("counter", function (status, value, max) {
    return status ? myClamp((100.0 * value) / max, 0, 100) : myClamp(100 - (100.0 * value) / max, 0, 100);
  });

  // Handle v12 removal of this helper
  Handlebars.registerHelper("select", function (selected, options) {
    const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
    const rgx = new RegExp(" value=[\"']" + escapedValue + "[\"']");
    const html = options.fn(this);
    return html.replace(rgx, "$& selected");
  });

  Handlebars.registerHelper("split", function (str, separator, keep) {
    return str.split(separator)[keep];
  });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper("concat", function () {
    let outStr = "";
    for (let arg in arguments) {
      if (typeof arguments[arg] != "object") {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper("isDefined", function (value) {
    return typeof value !== typeof void 0;
  });

  Handlebars.registerHelper("stoneWeight", function (sixths) {
    // Input: number of 1/6-stone units (e.g., 10 → 10/6 stones = 1 4/6)
    // Output: HTML string for nice display (e.g., "1 <sup>4</sup>&frasl;<sub>6</sub>")
    // Assumes non-negative; floors to integer sixths for safety

    sixths = Math.floor(Math.max(0, sixths)); // Handle negatives as 0

    if (sixths === 0) {
      return "0";
    }

    const whole = Math.floor(sixths / 6);
    const rem = sixths % 6;

    if (rem === 0) {
      return `${whole}`;
    }

    const fractionHTML = `<sup>${rem}</sup>&frasl;<sub>6</sub>`;

    return whole > 0 ? new Handlebars.SafeString(`${whole} ${fractionHTML}`) : new Handlebars.SafeString(fractionHTML);
  });
};
