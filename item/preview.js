/* Preview-only stubs so the live item-index.js keeps working offline.
   Production pages already load WGFIcon / the real API. */
(function () {
  "use strict";

  var ITEMS = [
    { item_id: 153635, item_name: "Roseate Pigment", slug: "roseate-pigment-153635", type: "Inscription", quality: "common", icon: "inv_inscription_pigment_pink.jpg", min_price: 18500, category: "herb" },
    { item_id: 2447, item_name: "Peacebloom", slug: "peacebloom-2447", type: "Herb", quality: "common", icon: "trade_herbalism.jpg", min_price: 1200, category: "herb" },
    { item_id: 765, item_name: "Silverleaf", slug: "silverleaf-765", type: "Herb", quality: "common", icon: "trade_herbalism.jpg", min_price: 900, category: "herb" },
    { item_id: 2770, item_name: "Copper Ore", slug: "copper-ore-2770", type: "Metal & Stone", quality: "common", icon: "trade_mining.jpg", min_price: 800, category: "ore" },
    { item_id: 2771, item_name: "Tin Ore", slug: "tin-ore-2771", type: "Metal & Stone", quality: "common", icon: "trade_mining.jpg", min_price: 2200, category: "ore" },
    { item_id: 10940, item_name: "Strange Dust", slug: "strange-dust-10940", type: "Enchanting", quality: "common", icon: "trade_engraving.jpg", min_price: 4500, category: "enchanting" },
    { item_id: 118, item_name: "Minor Healing Potion", slug: "minor-healing-potion-118", type: "Potion", quality: "common", icon: "inv_potion_51.jpg", min_price: 600, category: "potion" },
    { item_id: 774, item_name: "Malachite", slug: "malachite-774", type: "Jewelcrafting", quality: "uncommon", icon: "inv_misc_gem_01.jpg", min_price: 3400, category: "jewelcrafting" },
    { item_id: 2576, item_name: "Linen Cloak", slug: "linen-cloak-2576", type: "Cloth Armor", quality: "common", icon: "inv_chest_cloth_17.jpg", min_price: 1500, category: "armor" },
    { item_id: 2134, item_name: "Hand Axe", slug: "hand-axe-2134", type: "One-Handed Axe", quality: "common", icon: "inv_sword_04.jpg", min_price: 2100, category: "weapon" },
    { item_id: 2553, item_name: "Recipe: Elixir of Minor Agility", slug: "recipe-elixir-of-minor-agility-2553", type: "Recipe", quality: "uncommon", icon: "inv_scroll_03.jpg", min_price: 12500, category: "recipe" },
    { item_id: 2414, item_name: "Pinto Bridle", slug: "pinto-bridle-2414", type: "Mount", quality: "rare", icon: "ability_mount_ridinghorse.jpg", min_price: 850000, category: "mount" }
  ];

  window.WGFIcon = {
    url: function (icon, fallback) {
      if (!icon) return fallback;
      if (/^(https?:|data:|\/)/.test(icon)) return icon;
      return "/assets/icons/" + icon.replace(/\.(blp|tga)$/i, ".jpg");
    }
  };

  window.WGFApi = {
    bases: function () { return [""]; }
  };

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var search = url.match(/\/api\/item-index\/search\?q=([^&]+)/);
    if (search) {
      var q = decodeURIComponent(search[1]).toLowerCase();
      var hits = ITEMS.filter(function (it) {
        return it.item_name.toLowerCase().indexOf(q) !== -1 || String(it.item_id) === q;
      });
      return Promise.resolve(new Response(JSON.stringify({ items: hits }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    }
    var browse = url.match(/\/api\/item-index\/browse\?category=([^&]+)/);
    if (browse) {
      var cat = decodeURIComponent(browse[1]);
      var items = ITEMS.filter(function (it) { return it.category === cat; });
      return Promise.resolve(new Response(JSON.stringify({ items: items }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    }
    return nativeFetch(input, init);
  };

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='/item/']");
    if (!a) return;
    e.preventDefault();
  });
})();
