import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  // @IsString()
  // @IsNotEmpty()
  // model: string;
}
