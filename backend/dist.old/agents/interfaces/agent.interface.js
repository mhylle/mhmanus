"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCapability = exports.MessageType = exports.AgentType = void 0;
var AgentType;
(function (AgentType) {
    AgentType["DIRECTOR"] = "director";
    AgentType["CODE"] = "code";
    AgentType["RESEARCH"] = "research";
    AgentType["QA"] = "qa";
    AgentType["GENERAL"] = "general";
})(AgentType || (exports.AgentType = AgentType = {}));
var MessageType;
(function (MessageType) {
    MessageType["TASK_REQUEST"] = "task_request";
    MessageType["TASK_RESPONSE"] = "task_response";
    MessageType["STATUS_UPDATE"] = "status_update";
    MessageType["RESOURCE_REQUEST"] = "resource_request";
    MessageType["RESOURCE_RESPONSE"] = "resource_response";
    MessageType["COORDINATION"] = "coordination";
    MessageType["ERROR"] = "error";
})(MessageType || (exports.MessageType = MessageType = {}));
var AgentCapability;
(function (AgentCapability) {
    AgentCapability["TASK_PLANNING"] = "task_planning";
    AgentCapability["CODE_GENERATION"] = "code_generation";
    AgentCapability["TESTING"] = "testing";
    AgentCapability["RESEARCH"] = "research";
    AgentCapability["QUALITY_ASSURANCE"] = "qa";
    AgentCapability["PATTERN_LEARNING"] = "pattern_learning";
})(AgentCapability || (exports.AgentCapability = AgentCapability = {}));
//# sourceMappingURL=agent.interface.js.map