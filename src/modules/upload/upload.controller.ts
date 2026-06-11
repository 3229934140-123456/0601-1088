import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  private uploadDir: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.baseUrl = this.configService.get<string>('BASE_URL', '');
    const absoluteDir = path.resolve(process.cwd(), this.uploadDir);
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }
  }

  private getDestination(category: string): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const dir = path.join(process.cwd(), this.uploadDir, category, dateStr);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private buildFileUrl(file: Express.Multer.File): string {
    const relativePath = path.relative(
      path.join(process.cwd(), this.uploadDir),
      file.path,
    ).replace(/\\/g, '/');
    return `/uploads/${relativePath}`;
  }

  @Post('file')
  @ApiOperation({ summary: '上传单个文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const category = (req.query.category as string) || 'general';
          const dir = (req as any).uploadDir || `./uploads/${category}`;
          const absDir = path.resolve(process.cwd(), dir, 
            `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}`
          );
          if (!fs.existsSync(absDir)) {
            fs.mkdirSync(absDir, { recursive: true });
          }
          cb(null, absDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const filename = `${timestamp}_${random}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname || mimetype) {
          return cb(null, true);
        } else {
          cb(new BadRequestException('不支持的文件类型'), false);
        }
      },
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: string = 'general',
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const url = this.buildFileUrl(file);
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url,
      path: url,
      category,
      uploadedAt: new Date().toISOString(),
    };
  }

  @Post('files')
  @ApiOperation({ summary: '批量上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const category = (req.query.category as string) || 'general';
          const date = new Date();
          const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
          const absDir = path.resolve(process.cwd(), './uploads', category, dateStr);
          if (!fs.existsSync(absDir)) {
            fs.mkdirSync(absDir, { recursive: true });
          }
          cb(null, absDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const filename = `${timestamp}_${random}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname || mimetype) {
          return cb(null, true);
        } else {
          cb(new BadRequestException('不支持的文件类型'), false);
        }
      },
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('category') category: string = 'general',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return files.map((file) => {
      const url = this.buildFileUrl(file);
      return {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url,
        path: url,
        category,
        uploadedAt: new Date().toISOString(),
      };
    });
  }
}
