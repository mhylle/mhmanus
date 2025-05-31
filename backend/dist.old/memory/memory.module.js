"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ioredis_1 = require("@nestjs-modules/ioredis");
const llm_module_1 = require("../llm/llm.module");
const memory_service_1 = require("./memory.service");
const short_term_memory_service_1 = require("./services/short-term-memory.service");
const long_term_memory_service_1 = require("./services/long-term-memory.service");
const semantic_memory_service_1 = require("./services/semantic-memory.service");
const episodic_memory_service_1 = require("./services/episodic-memory.service");
const memory_controller_1 = require("./memory.controller");
const task_memory_entity_1 = require("./entities/task-memory.entity");
const embedding_entity_1 = require("./entities/embedding.entity");
let MemoryModule = class MemoryModule {
};
exports.MemoryModule = MemoryModule;
exports.MemoryModule = MemoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                task_memory_entity_1.TaskMemoryEntity,
                task_memory_entity_1.LearnedPatternEntity,
                task_memory_entity_1.CodeSnippetEntity,
                task_memory_entity_1.EpisodeEntity,
                embedding_entity_1.EmbeddingEntity,
            ]),
            ioredis_1.RedisModule.forRoot({
                type: 'single',
                url: 'redis://redis:6379',
            }),
            llm_module_1.LLMModule,
        ],
        controllers: [memory_controller_1.MemoryController],
        providers: [
            memory_service_1.MemoryService,
            short_term_memory_service_1.ShortTermMemoryService,
            long_term_memory_service_1.LongTermMemoryService,
            semantic_memory_service_1.SemanticMemoryService,
            episodic_memory_service_1.EpisodicMemoryService,
        ],
        exports: [memory_service_1.MemoryService],
    })
], MemoryModule);
//# sourceMappingURL=memory.module.js.map