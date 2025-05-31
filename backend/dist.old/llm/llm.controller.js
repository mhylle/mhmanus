"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMController = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("./llm.service");
const completion_dto_1 = require("./dto/completion.dto");
let LLMController = class LLMController {
    llmService;
    constructor(llmService) {
        this.llmService = llmService;
    }
    async generateCompletion(dto) {
        return this.llmService.generateCompletion(dto.prompt, dto.options);
    }
    async checkHealth() {
        const health = await this.llmService.checkProviderHealth();
        return {
            providers: Object.fromEntries(health),
            timestamp: new Date().toISOString(),
        };
    }
    getProviders() {
        return {
            providers: this.llmService.getAvailableProviders(),
        };
    }
    getProviderInfo(name) {
        return this.llmService.getProviderInfo(name);
    }
};
exports.LLMController = LLMController;
__decorate([
    (0, common_1.Post)('completion'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [completion_dto_1.CompletionDto]),
    __metadata("design:returntype", Promise)
], LLMController.prototype, "generateCompletion", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LLMController.prototype, "checkHealth", null);
__decorate([
    (0, common_1.Get)('providers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LLMController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Get)('providers/:name'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LLMController.prototype, "getProviderInfo", null);
exports.LLMController = LLMController = __decorate([
    (0, common_1.Controller)('llm'),
    __metadata("design:paramtypes", [llm_service_1.LLMService])
], LLMController);
//# sourceMappingURL=llm.controller.js.map