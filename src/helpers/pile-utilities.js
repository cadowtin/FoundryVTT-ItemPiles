import * as Utilities from "./utilities.js"
import CONSTANTS from "../constants/constants.js";

function getFlagData(inDocument, flag, defaults) {
  defaults = foundry.utils.duplicate(defaults);
  const flags = getProperty(inDocument, CONSTANTS.FLAGS.PILE) ?? {};
  const data = foundry.utils.duplicate(flags);
  return foundry.utils.mergeObject(defaults, data);
}

export function getItemFlagData(item) {
  return getFlagData(Utilities.getDocument(item), CONSTANTS.FLAGS.ITEM, CONSTANTS.ITEM_DEFAULTS);
}

export function getActorFlagData(target) {
  return getFlagData(Utilities.getActor(target), CONSTANTS.FLAGS.PILE, CONSTANTS.PILE_DEFAULTS);
}

export function isValidItemPile(target, data = false) {
  const targetActor = Utilities.getActor(target);
  return targetActor && !targetActor.destroyed && (data || getActorFlagData(targetActor))?.enabled;
}

export function isItemPileContainer(target) {
  const targetActor = Utilities.getActor(target);
  const pileData = getActorFlagData(targetActor);
  return pileData?.enabled && pileData?.isContainer;
}

export function isItemPileClosed(target) {
  const targetActor = Utilities.getActor(target);
  const pileData = getActorFlagData(targetActor);
  if (!pileData?.enabled || !pileData?.isContainer) return false;
  return pileData.closed;
}

export function isItemPileLocked(target) {
  const targetActor = Utilities.getActor(target);
  const pileData = getActorFlagData(targetActor);
  if (!pileData?.enabled || !pileData?.isContainer) return false;
  return pileData.locked;
}

export function getActorItems(target, { itemFilters = false, itemCurrencies = true } = {}) {
  const targetActor = Utilities.getActor(target);
  const pileItemFilters = itemFilters ? itemFilters : getActorItemFilters(targetActor);
  const currencyItems = itemCurrencies ? getActorCurrencyItems(targetActor) : [];
  return targetActor.items.filter(item => {
    return !currencyItems.find(currency => currency.item === item) && !isItemInvalid(targetActor, item, pileItemFilters);
  });
}

export function getActorCurrencyItems(target) {
  const targetActor = Utilities.getActor(target)
  const targetItems = Array.from(targetActor.items);
  return getActorCurrencyData(targetActor)?.items.map(currency => {
    return Utilities.findSimilarItem(targetItems, currency) || false;
  }).filter(Boolean) ?? [];
}

export function isItemInvalid(targetActor, item, itemFilters = false) {
  const pileItemFilters = itemFilters ? itemFilters : getActorItemFilters(targetActor)
  const itemData = item instanceof Item ? item.data : item;
  for (const filter of pileItemFilters) {
    if (!hasProperty(itemData, filter.path)) continue;
    const attributeValue = getProperty(itemData, filter.path);
    if (filter.filters.has(attributeValue)) {
      return attributeValue;
    }
  }
  return false;
}

export function getActorItemFilters(target) {
  if (!target) return cleanItemFilters(foundry.utils.duplicate(game.itempiles.ITEM_FILTERS));
  const targetActor = Utilities.getActor(target);
  const pileData = getActorFlagData(targetActor);
  return isValidItemPile(targetActor) && pileData?.overrideItemFilters
    ? cleanItemFilters(pileData.overrideItemFilters)
    : cleanItemFilters(game.itempiles.ITEM_FILTERS);
}


export function cleanItemFilters(itemFilters) {
  return itemFilters ? foundry.utils.duplicate(itemFilters).map(filter => {
    filter.path = filter.path.trim();
    filter.filters = Array.isArray(filter.filters) ? filter.filters : filter.filters.split(',').map(string => string.trim());
    filter.filters = new Set(filter.filters)
    return filter;
  }) : [];
}

export function getActorCurrencyData(target) {
  const targetActor = Utilities.getActor(target);
  const pileData = getActorFlagData(targetActor);
  return (pileData.overrideCurrencies || game.itempiles.CURRENCIES);
}

export function getActorCurrencyAttributes(target) {
  const targetActor = Utilities.getActor(target)
  const pileData = getActorFlagData(targetActor);
  const currencyData = pileData.overrideCurrencies || game.itempiles.CURRENCIES;
  return currencyData?.attributes.map(currency => {
    currency.name = game.i18n.localize(currency.name);
    return currency;
  }) ?? [];
}

export function getActorAttributes(target) {
  const targetActor = Utilities.getActor(target)
  const attributes = getActorCurrencyAttributes(targetActor);
  const items = getActorCurrencyItems(targetActor);
  return { attributes, items };
}

export function getFormattedActorCurrencies(target, { currencyList = false, getAll = false } = {}) {
  const targetActor = Utilities.getActor(target)
  const currencies = currencyList || getActorCurrencyAttributes(targetActor);
  return currencies.filter(currency => {
    return getAll || hasProperty(targetActor.data, currency.path) && Number(getProperty(targetActor.data, currency.path)) > 0;
  }).map((currency, index) => {
    return {
      name: game.i18n.has(currency.name) ? game.i18n.localize(currency.name) : currency.name,
      path: currency.path,
      img: currency.img,
      quantity: Number(getProperty(targetActor.data, currency.path) ?? 0),
      index: index
    };
  });
}

export function isItemPileEmpty(target) {
  
  const targetActor = Utilities.getActor(target);
  if (!targetActor) return false;
  
  const validItemPile = isValidItemPile(targetActor);
  if (!validItemPile) return false;
  
  const hasNoItems = getActorItems(targetActor).length === 0;
  const hasNoCurrencies = getFormattedActorCurrencies(targetActor).length === 0;
  
  return validItemPile && hasNoItems && hasNoCurrencies;
  
}


export function getItemPileTokenImage(token, { data = false, items = false, currencies = false } = {}) {
  
  const tokenDocument = Utilities.getDocument(token);
  
  const itemPileData = data || getActorFlagData(tokenDocument);
  
  let originalImg;
  if (tokenDocument instanceof TokenDocument) {
    originalImg = tokenDocument.data.img;
  } else {
    originalImg = tokenDocument.data.token.img;
  }
  
  if (!isValidItemPile(tokenDocument)) return originalImg;
  
  items = items || getActorItems(tokenDocument).map(item => item.toObject());
  currencies = currencies || getFormattedActorCurrencies(tokenDocument);
  
  const numItems = items.length + currencies.length;
  
  let img;
  
  if (itemPileData.displayOne && numItems === 1) {
    img = items.length > 0
      ? items[0].img
      : currencies[0].img;
  } else if (itemPileData.displayOne && numItems > 1) {
    img = (tokenDocument.actor ?? tokenDocument).data.token.img;
  }
  
  if (itemPileData.isContainer) {
    
    img = itemPileData.lockedImage || itemPileData.closedImage || itemPileData.openedImage || itemPileData.emptyImage;
    
    if (itemPileData.locked && itemPileData.lockedImage) {
      img = itemPileData.lockedImage;
    } else if (itemPileData.closed && itemPileData.closedImage) {
      img = itemPileData.closedImage;
    } else if (itemPileData.emptyImage && isItemPileEmpty(tokenDocument)) {
      img = itemPileData.emptyImage;
    } else if (itemPileData.openedImage) {
      img = itemPileData.openedImage;
    }
    
  }
  
  return img || originalImg;
  
}

export function getItemPileTokenScale(target, { data = false, items = false, currencies = false } = {}) {
  
  const pileDocument = Utilities.getDocument(target);
  
  let itemPileData = data || getActorFlagData(pileDocument);
  
  let baseScale;
  if (pileDocument instanceof TokenDocument) {
    baseScale = pileDocument.data.scale;
  } else {
    baseScale = pileDocument.data.token.scale;
  }
  
  if (!isValidItemPile(pileDocument, itemPileData)) {
    return baseScale;
  }
  
  items = items || getActorItems(pileDocument);
  currencies = currencies || getFormattedActorCurrencies(pileDocument);
  
  const numItems = items.length + currencies.length;
  
  if (itemPileData.isContainer || !itemPileData.displayOne || !itemPileData.overrideSingleItemScale || numItems > 1 || numItems === 0) {
    return baseScale;
  }
  
  return itemPileData.singleItemScale;
  
}

export function getItemPileName(target, { data = false, items = false, currencies = false } = {}) {
  
  const pileDocument = Utilities.getDocument(target);
  
  const itemPileData = data || getActorFlagData(pileDocument);
  
  let name;
  if (pileDocument instanceof TokenDocument) {
    name = pileDocument.data.name;
  } else {
    name = pileDocument.data.token.name;
  }
  
  if (!isValidItemPile(pileDocument, itemPileData)) {
    return name;
  }
  
  items = items || getActorItems(pileDocument);
  currencies = currencies || getFormattedActorCurrencies(pileDocument);
  
  const numItems = items.length + currencies.length;
  
  if (itemPileData.isContainer || !itemPileData.displayOne || !itemPileData.showItemName || numItems > 1 || numItems === 0) {
    return name;
  }
  
  const item = items.length > 0
    ? items[0]
    : currencies[0];
  
  return item.name;
  
}

export function getItemsToAdd(targetActor, items) {
  
  const targetActorItems = Array.from(targetActor.items);
  
  const itemsAdded = [];
  const itemsToUpdate = [];
  const itemsToCreate = [];
  for (const itemData of items) {
    
    let item = itemData?.item ?? itemData;
    delete item._id;
    
    const foundItem = Utilities.findSimilarItem(targetActorItems, item);
    
    const incomingQuantity = Number(itemData?.quantity ?? Utilities.getItemQuantity(itemData));
    
    if (foundItem) {
      item = foundItem.toObject();
      const currentQuantity = Utilities.getItemQuantity(item);
      const newQuantity = currentQuantity + incomingQuantity;
      itemsToUpdate.push({
        "_id": item._id,
        [game.itempiles.ITEM_QUANTITY_ATTRIBUTE]: newQuantity
      });
      
      setProperty(item, game.itempiles.ITEM_QUANTITY_ATTRIBUTE, newQuantity)
      itemsAdded.push({
        item: item,
        quantity: incomingQuantity
      });
    } else {
      setProperty(item, game.itempiles.ITEM_QUANTITY_ATTRIBUTE, incomingQuantity)
      itemsToCreate.push(item);
    }
    
  }
  
  return { itemsAdded, itemsToUpdate, itemsToCreate };
  
}

export function getItemsToRemove(targetActor, items) {
  
  const itemsRemoved = []
  const itemsToUpdate = [];
  const itemsToDelete = [];
  for (const itemData of items) {
    
    let item = targetActor.items.get(itemData._id);
    if (!item) continue;
    
    item = item.toObject();
    
    const currentQuantity = Utilities.getItemQuantity(item);
    const quantityToRemove = itemData.quantity;
    const newQuantity = Math.max(0, currentQuantity - quantityToRemove);
    
    if (newQuantity >= 1) {
      itemsToUpdate.push({ _id: item._id, [game.itempiles.ITEM_QUANTITY_ATTRIBUTE]: newQuantity });
      setProperty(item, game.itempiles.ITEM_QUANTITY_ATTRIBUTE, quantityToRemove);
      itemsRemoved.push({
        item: item,
        quantity: quantityToRemove,
        deleted: false
      });
    } else {
      itemsToDelete.push(item._id);
      setProperty(item, game.itempiles.ITEM_QUANTITY_ATTRIBUTE, currentQuantity);
      itemsRemoved.push({
        item: item,
        quantity: currentQuantity,
        deleted: true
      });
    }
    
  }
  
  return { itemsRemoved, itemsToUpdate, itemsToDelete };
  
}

export function getAttributesToAdd(targetActor, attributes) {
  
  const updates = {};
  const attributesAdded = {};
  
  for (const [attribute, quantityToAdd] of Object.entries(attributes)) {
    
    const currentQuantity = Number(getProperty(targetActor.data, attribute));
    
    updates[attribute] = currentQuantity + quantityToAdd;
    attributesAdded[attribute] = quantityToAdd;
    
  }
  
  return { updates, attributesAdded }
  
}

export function getAttributesToRemove(targetActor, attributes) {
  
  const updates = {};
  const attributesRemoved = {};
  
  if (Array.isArray(attributes)) {
    attributes = Object.fromEntries(attributes.map(attribute => {
      return [attribute, Number(getProperty(targetActor.data, attribute))];
    }));
  }
  
  for (const [attribute, quantityToRemove] of Object.entries(attributes)) {
    
    const currentQuantity = Number(getProperty(targetActor.data, attribute));
    const newQuantity = Math.max(0, currentQuantity - quantityToRemove);
    
    updates[attribute] = newQuantity;
    
    // if the target's quantity is above 1, we've removed the amount we expected, otherwise however many were left
    attributesRemoved[attribute] = newQuantity ? quantityToRemove : currentQuantity;
  }
  
  return { updates, attributesRemoved };
  
}


function getRelevantTokensAndActor(target) {
  
  const relevantDocument = Utilities.getDocument(target);
  
  let documentActor;
  let documentTokens = [];
  
  if (relevantDocument instanceof Actor) {
    documentActor = relevantDocument;
    if (relevantDocument.token) {
      documentTokens.push(relevantDocument?.token);
    } else {
      documentTokens = canvas.tokens.placeables.filter(token => token.document.actor === documentActor).map(token => token.document);
    }
  } else {
    documentActor = relevantDocument.actor;
    if (relevantDocument.isLinked) {
      documentTokens = canvas.tokens.placeables.filter(token => token.document.actor === documentActor).map(token => token.document);
    } else {
      documentTokens.push(relevantDocument);
    }
  }
  
  return [documentActor, documentTokens]
  
}

export async function updateItemPileData(target, flagData, tokenData) {
  
  if (!tokenData) tokenData = {};
  
  const [documentActor, documentTokens] = getRelevantTokensAndActor(target);
  
  const targetItems = getActorItems(documentActor, { itemFilters: flagData.itemFilters, itemCurrencies: true });
  const attributes = getFormattedActorCurrencies(documentActor, { currencyList: flagData.currencies });
  
  const pileData = { data: flagData, items: targetItems, currencies: attributes };
  
  const updates = documentTokens.map(tokenDocument => {
    const newTokenData = foundry.utils.mergeObject(tokenData, {
      "img": getItemPileTokenImage(tokenDocument, pileData),
      "scale": getItemPileTokenScale(tokenDocument, pileData),
      "name": getItemPileName(tokenDocument, pileData),
    });
    return {
      "_id": tokenDocument.id,
      ...newTokenData,
      [CONSTANTS.FLAGS.PILE]: flagData
    }
  });
  
  await canvas.scene.updateEmbeddedDocuments("Token", updates);
  
  return documentActor.update({
    [CONSTANTS.FLAGS.PILE]: flagData,
    [`token.${CONSTANTS.FLAGS.PILE}`]: flagData
  });
  
}