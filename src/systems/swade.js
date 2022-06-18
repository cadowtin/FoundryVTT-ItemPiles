export default {
  // The actor class type is the type of actor that will be used for the default item pile actor that is created on first item drop.
  "ACTOR_CLASS_TYPE": "character",

  // The item quantity attribute is the path to the attribute on items that denote how many of that item that exists
  "ITEM_QUANTITY_ATTRIBUTE": "data.quantity",

  // Item types and the filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, feats, and classes
  "ITEM_FILTERS": [
    {
      "path": "type",
      "filters": "edge,hindrance,skill,power,ability"
    }
  ],

  // Item similarities determines how item piles detect similarities and differences in the system
  "ITEM_SIMILARITIES": ["name", "type"],

  "CURRENCIES": {
    // Currencies in item piles are a list of names, attribute paths, and images - the attribute path is relative to the actor.data
    "attributes": [
      {
        name: "SWADE.Currency",
        path: "data.details.currency",
        img: "icons/svg/coins.svg",
        primary: true,
        exchange: 1
      }
    ],

    // While attribute currencies exist in character data, item currencies are items that act LIKE currencies
    "items": []
  }
}