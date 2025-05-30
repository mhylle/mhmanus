import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompletionOptionsDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;

  @IsOptional()
  @IsNumber()
  topK?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stopSequences?: string[];

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

export class CompletionDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompletionOptionsDto)
  options?: CompletionOptionsDto;
}
