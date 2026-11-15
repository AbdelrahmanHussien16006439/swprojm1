import { Role } from '../enums/role.enum';

export interface JwtUser {
  sub: string; // user id
  sid: string; // session id
  email: string;
  role: Role;
  providerId?: string; // airlineId (airline_moderator) or hotelId (hotel_moderator)
}
