import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogModule } from '../blog/blog.module';
import { Report, ReportSchema } from './schemas/report.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UsersModule } from '../users/users.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    BlogModule,
    UsersModule,
    ReviewsModule,
    ItinerariesModule,
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService, MongooseModule],
})
export class ReportsModule {}
