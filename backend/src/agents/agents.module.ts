import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LLMModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { ExecutionModule } from '../execution/execution.module';
import { ToolsModule } from '../tools/tools.module';
import { DirectorAgent } from './director/director.agent';
import { CodeAgent } from './code/code.agent';
import { AgentsService } from './agents.service';
import { AgentRegistry } from './agent.registry';
import { AgentCommunicationBus } from './communication/agent-communication.bus';
import { AgentsController } from './agents.controller';
import { TemplateService } from './templates/template.service';
import { TestGeneratorService } from './testing/test-generator.service';
import { ProjectGeneratorService } from './project/project-generator.service';
import { CodeQualityService } from './quality/code-quality.service';
import { CodeGenerationController } from './code-generation.controller';

@Module({
  imports: [
    LLMModule,
    EventEmitterModule.forRoot(),
    forwardRef(() => MemoryModule),
    ExecutionModule,
    ToolsModule,
  ],
  controllers: [AgentsController, CodeGenerationController],
  providers: [
    AgentsService,
    AgentRegistry,
    AgentCommunicationBus,
    DirectorAgent,
    CodeAgent,
    TemplateService,
    TestGeneratorService,
    ProjectGeneratorService,
    CodeQualityService,
    // TODO: Add ResearchAgent, QAAgent when implemented
  ],
  exports: [
    AgentsService,
    AgentRegistry,
    TemplateService,
    TestGeneratorService,
    ProjectGeneratorService,
    CodeQualityService,
  ],
})
export class AgentsModule {}
