import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hotel, HotelSchema } from './schemas/hotel.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { HotelsService } from './hotels.service';

// Owner: Member 5 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hotel.name, schema: HotelSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  providers: [HotelsService],
  exports: [HotelsService, MongooseModule],
})
export class HotelsModule {}
