export const registerHelpers = async function () {
  // Handlebars template helpers
  Handlebars.registerHelper("eq", function (a, b) {
    return a == b;
  });

  Handlebars.registerHelper("gt", function (a, b) {
    return a >= b;
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
  })

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
  })

  Handlebars.registerHelper("roundTreas", function (value) {
    return Math.round(value * 100) / 100;
  })

  Handlebars.registerHelper("roundWeight", function (weight) {
    return Math.round(parseFloat(weight) / 100) / 10;
  });

  Handlebars.registerHelper("getTagIcon", function (tag) {
    const index = Object.keys(CONFIG.ACKS.tags).find(k => (CONFIG.ACKS.tags[k] == tag));
    return CONFIG.ACKS.tag_images[index];
  });

  const myClamp = (num, min, max) => Math.min(Math.max(num, min), max)
  Handlebars.registerHelper("counter", function (status, value, max) {
    return status
      ? myClamp((100.0 * value) / max, 0, 100)
      : myClamp(100 - (100.0 * value) / max, 0, 100);
  });

  // Handle v12 removal of this helper
  Handlebars.registerHelper('select', function (selected, options) {
    const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
    const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']');
    const html = options.fn(this);
    return html.replace(rgx, "$& selected");
  });

};
