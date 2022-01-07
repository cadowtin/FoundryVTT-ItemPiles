import CONSTANTS from "../constants.js";

export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function debug(msg, args = "") {
    if (game.settings.get(CONSTANTS.MODULE_NAME, "debug")) console.log(`DEBUG | Item Piles | ${msg}`, args)
}

export function custom_notify(message) {
    message = `Item Piles | ${message}`;
    ui.notifications.notify(message);
    console.log(message.replace("<br>", "\n"));
}

export function custom_warning(warning, notify = false) {
    warning = `Item Piles | ${warning}`;
    if (notify) ui.notifications.warn(warning);
    console.warn(warning.replace("<br>", "\n"));
}

export function custom_error(error, notify = true) {
    error = `Item Piles | ${error}`;
    if (notify) ui.notifications.error(error);
    return new Error(error.replace("<br>", "\n"));
}

export function getTokensAtLocation(position) {
    const tokens = [...canvas.tokens.placeables];
    return tokens.filter(token => {
        return position.x >= token.x && position.x < (token.x + (token.data.width * canvas.grid.size))
            && position.y >= token.y && position.y < (token.y + (token.data.height * canvas.grid.size));
    });
}

export function distance_between_rect(p1, p2) {

    const x1 = p1.x;
    const y1 = p1.y;
    const x1b = p1.x + p1.w;
    const y1b = p1.y + p1.h;

    const x2 = p2.x;
    const y2 = p2.y;
    const x2b = p2.x + p2.w;
    const y2b = p2.y + p2.h;

    const left = x2b < x1;
    const right = x1b < x2;
    const bottom = y2b < y1;
    const top = y1b < y2;

    if (top && left) {
        return distance_between({ x: x1, y: y1b }, { x: x2b, y: y2 });
    } else if (left && bottom) {
        return distance_between({ x: x1, y: y1 }, { x: x2b, y: y2b });
    } else if (bottom && right) {
        return distance_between({ x: x1b, y: y1 }, { x: x2, y: y2b });
    } else if (right && top) {
        return distance_between({ x: x1b, y: y1b }, { x: x2, y: y2 });
    } else if (left) {
        return x1 - x2b;
    } else if (right) {
        return x2 - x1b;
    } else if (bottom) {
        return y1 - y2b;
    } else if (top) {
        return y2 - y1b;
    }

    return 0;

}

export function distance_between(a, b) {
    return new Ray(a, b).distance;
}

export function getSimilarItem(items, { itemId, itemName, itemType }={}) {
    for (const item of items) {
        if (item.id === itemId || (item.name === itemName && item.type === itemType)) {
            return item;
        }
    }
    return false;
}

export async function getToken(documentUuid) {
    const document = await fromUuid(documentUuid);
    return document?.token ?? document;
}

export function getUuid(target) {
    // If it's an actor, get its TokenDocument
    // If it's a token, get its Document
    // If it's a TokenDocument, just use it
    // Otherwise fail
    const document = target?.document ?? target;
    return document?.uuid ?? false;
}

export function is_real_number(inNumber) {
    return !isNaN(inNumber)
        && typeof inNumber === "number"
        && isFinite(inNumber);
}

export function getItemPileData(document){
    if(document instanceof TokenDocument && document?.data?.actorLink){
        document = document?.actor;
    }
    try{
        return foundry.utils.duplicate(document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME) ?? {});
    }catch(err){
        return {};
    }

}

export function hasNonzeroAttribute(target, attribute){
    const actor = target instanceof TokenDocument
        ? target.actor
        : target;
    const attributeValue = getProperty(actor.data, attribute) ?? 0;
    return hasProperty(actor.data, attribute) && attributeValue > 0;
}

export async function updateItemPile(inDocument, flagData, tokenData){

    if(!tokenData) tokenData = {};

    if(inDocument instanceof TokenDocument && inDocument.data.actorLink){
        inDocument = inDocument.actor;
    }else if(inDocument instanceof Actor && inDocument.token){
        inDocument = inDocument.token;
    }

    if (inDocument instanceof TokenDocument) {
        return inDocument.update({
            ...tokenData,
            [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagData,
            [`actorData.flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagData
        });
    }

    return inDocument.update({
        [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagData,
        "token": {
            [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagData,
            ...tokenData
        }
    });

}

export function dialogWarning(message, icon = "fas fa-exclamation-triangle"){
    return `<p class="item-piles-dialog">
        <i style="font-size:3rem;" class="${icon}"></i><br><br>
        <strong style="font-size:1.2rem;">Item Piles</strong>
        <br><br>${message}
    </p>`;
}