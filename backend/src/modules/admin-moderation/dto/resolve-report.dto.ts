import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ReportResolutionAction {
  DISMISS = 'dismiss',
  HIDE = 'hide',
  DELETE = 'delete',
}

export class ResolveReportDto {
  @ApiProperty({
    enum: ReportResolutionAction,
    example: ReportResolutionAction.DISMISS,
  })
  @IsEnum(ReportResolutionAction)
  action: ReportResolutionAction;
}
