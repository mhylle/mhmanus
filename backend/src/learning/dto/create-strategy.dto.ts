import { IsString, IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StrategyCondition, StrategyAction } from '../interfaces/learning.interface';

export class StrategyConditionDto implements StrategyCondition {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty()
  @IsString()
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'regex';

  @ApiProperty()
  value: any;
}

export class StrategyActionDto implements StrategyAction {
  @ApiProperty()
  @IsString()
  type: 'use_pattern' | 'avoid_tool' | 'prefer_tool' | 'set_parameter' | 'delegate_to';

  @ApiProperty()
  @IsString()
  target: string;

  @ApiProperty({ required: false })
  @IsOptional()
  parameters?: Record<string, any>;
}

export class CreateStrategyDto {
  @ApiProperty()
  @IsString()
  agentType: string;

  @ApiProperty()
  @IsString()
  taskType: string;

  @ApiProperty({ type: [StrategyConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyConditionDto)
  conditions: StrategyConditionDto[];

  @ApiProperty({ type: [StrategyActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyActionDto)
  actions: StrategyActionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priority?: number;
}