import { ParseIntPipe } from '@nestjs/common';

export const IdPipe = new ParseIntPipe({ errorHttpStatusCode: 400 });
