
import { fileService } from './file.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { fileQuerySchema } from './file.validation.js';

const publicFile = ({ storagePath, storedName, size, ...file }) => ({
  ...file,
  size: typeof size === 'bigint' ? size.toString() : size,
});

export class FileController {
  upload = asyncHandler(async (req, res) => {
    const fileRecord = await fileService.uploadFile(
      req.user.id,
      req.file
    );

    const publicRecord = publicFile(fileRecord);

    return res
      .status(201)
      .json(
        ApiResponse.created(
          publicRecord,
          'File uploaded successfully and processing initiated'
        )
      );
  });

  // ADMIN sees all files; USER sees only their own files.
  list = asyncHandler(async (req, res) => {
    const query = fileQuerySchema.parse(req.query);

    // Pass the complete user object so the service can check the role.
    const result = await fileService.getFiles(req.user, query);

    const files = result.files.map(publicFile);

    return res
      .status(200)
      .json(
        ApiResponse.success(
          files,
          'Files retrieved successfully',
          200,
          result.pagination
        )
      );
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const file = await fileService.getFileById(id, req.user);
    const safeFile = publicFile(file);

    return res
      .status(200)
      .json(ApiResponse.success(safeFile, 'File retrieved successfully'));
  });

  getStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const statusData = await fileService.getFileStatus(id, req.user);

    return res
      .status(200)
      .json(
        ApiResponse.success(
          statusData,
          'File status retrieved successfully'
        )
      );
  });

  getExtractedText = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const extractedData = await fileService.getExtractedText(
      id,
      req.user
    );

    return res
      .status(200)
      .json(
        ApiResponse.success(
          extractedData,
          'Extracted text retrieved successfully'
        )
      );
  });

  reprocess = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await fileService.reprocessFile(id, req.user);

    return res
      .status(200)
      .json(
        ApiResponse.success(
          result,
          'Document reprocessing scheduled successfully'
        )
      );
  });

  download = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const { stream, file } = await fileService.getFileForDownload(
      id,
      req.user
    );

    res.setHeader(
      'Content-Type',
      file.mimeType || 'application/octet-stream'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`
    );

    res.setHeader('Content-Length', file.size.toString());

    stream.on('error', (err) => {
      if (!res.headersSent) {
        next(err);
      }
    });

    stream.pipe(res);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await fileService.deleteFile(id, req.user);

    return res
      .status(200)
      .json(ApiResponse.success(result, 'File deleted successfully'));
  });
}

export const fileController = new FileController();
