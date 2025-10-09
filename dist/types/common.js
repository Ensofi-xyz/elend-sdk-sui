"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardOption = exports.UserActionType = exports.Network = void 0;
var Network;
(function (Network) {
    Network["Mainnet"] = "mainnet";
    Network["Testnet"] = "testnet";
})(Network || (exports.Network = Network = {}));
var UserActionType;
(function (UserActionType) {
    UserActionType[UserActionType["Deposit"] = 0] = "Deposit";
    UserActionType[UserActionType["Withdraw"] = 1] = "Withdraw";
    UserActionType[UserActionType["Borrow"] = 2] = "Borrow";
    UserActionType[UserActionType["Repay"] = 3] = "Repay";
})(UserActionType || (exports.UserActionType = UserActionType = {}));
var RewardOption;
(function (RewardOption) {
    RewardOption[RewardOption["Deposit"] = 0] = "Deposit";
    RewardOption[RewardOption["Borrow"] = 1] = "Borrow";
})(RewardOption || (exports.RewardOption = RewardOption = {}));
//# sourceMappingURL=common.js.map