import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ExtractionService } from './extraction.service';

@Controller('properties/:propertyId')
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  triggerExtraction(
    @Param('propertyId') propertyId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const documentUrl = file ? `/uploads/${file.filename}` : undefined;
    return this.extractionService.triggerExtraction(propertyId, documentUrl);
  }

  @Get('extraction')
  getExtraction(@Param('propertyId') propertyId: string) {
    return this.extractionService.getExtraction(propertyId);
  }

  @Post('extraction/apply')
  applyExtraction(@Param('propertyId') propertyId: string) {
    return this.extractionService.applyExtraction(propertyId);
  }
}
