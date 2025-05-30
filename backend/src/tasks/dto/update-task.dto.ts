import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsEnum, IsOptional, IsObject, IsString } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsObject()
  result?: Record<string, any> | null;

  @IsOptional()
  @IsString()
  error?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
