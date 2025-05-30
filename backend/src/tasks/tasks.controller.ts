import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from './entities/task.entity';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  findAll(@Query('status') status?: TaskStatus) {
    if (status) {
      // TODO: Add filtering by status
      return this.tasksService.findAll();
    }
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.updateStatus(id, TaskStatus.CANCELLED);
  }

  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    const task = await this.tasksService.findOne(id);
    if (task.status !== TaskStatus.FAILED) {
      throw new Error('Only failed tasks can be retried');
    }

    // Reset task and re-queue
    await this.tasksService.update(id, {
      status: TaskStatus.PENDING,
      error: null,
      result: null,
    });

    return this.tasksService.updateStatus(id, TaskStatus.QUEUED);
  }
}
