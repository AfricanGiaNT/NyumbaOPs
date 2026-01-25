"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidStatusTransition = isValidStatusTransition;
const STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["CHECKED_IN", "CANCELLED"],
    CHECKED_IN: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
};
function isValidStatusTransition(current, next) {
    return STATUS_TRANSITIONS[current].includes(next);
}
