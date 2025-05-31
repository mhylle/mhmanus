"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const llm_module_1 = require("../llm/llm.module");
const memory_module_1 = require("../memory/memory.module");
const director_agent_1 = require("./director/director.agent");
const code_agent_1 = require("./code/code.agent");
const agents_service_1 = require("./agents.service");
const agent_registry_1 = require("./agent.registry");
const agent_communication_bus_1 = require("./communication/agent-communication.bus");
const agents_controller_1 = require("./agents.controller");
const template_service_1 = require("./templates/template.service");
const test_generator_service_1 = require("./testing/test-generator.service");
const project_generator_service_1 = require("./project/project-generator.service");
const code_quality_service_1 = require("./quality/code-quality.service");
const code_generation_controller_1 = require("./code-generation.controller");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            llm_module_1.LLMModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            (0, common_1.forwardRef)(() => memory_module_1.MemoryModule),
        ],
        controllers: [agents_controller_1.AgentsController, code_generation_controller_1.CodeGenerationController],
        providers: [
            agents_service_1.AgentsService,
            agent_registry_1.AgentRegistry,
            agent_communication_bus_1.AgentCommunicationBus,
            director_agent_1.DirectorAgent,
            code_agent_1.CodeAgent,
            template_service_1.TemplateService,
            test_generator_service_1.TestGeneratorService,
            project_generator_service_1.ProjectGeneratorService,
            code_quality_service_1.CodeQualityService,
        ],
        exports: [
            agents_service_1.AgentsService,
            agent_registry_1.AgentRegistry,
            template_service_1.TemplateService,
            test_generator_service_1.TestGeneratorService,
            project_generator_service_1.ProjectGeneratorService,
            code_quality_service_1.CodeQualityService,
        ],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map